# Policy Evidence Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Policy Overview tab, show tasks that serve as evidence for the policy (grouped by Control). On the Task Overview tab, mirror it with policies grouped by Control. Read-only, zero schema changes, transitive via the existing `Policy.controls` ↔ `Task.controls` M2M.

**Architecture:** Two new GET endpoints compute the transitive set at query time via Prisma `include`. Two SWR hooks + two React components surface the result. Linking remains managed by the existing Policy↔Control mapping UI.

**Tech Stack:** NestJS + Prisma (API), Next.js + SWR + `@trycompai/design-system` (app), Jest (API tests), Vitest + testing-library/react (app tests).

**Spec:** `docs/superpowers/specs/2026-04-24-policy-evidence-tasks-design.md`

---

## File Structure

### Created

- `apps/api/src/policies/policies.controller.spec.ts` — new `describe('getPolicyEvidenceTasks')` block (modify)
- `apps/api/src/tasks/tasks.controller.spec.ts` — new `describe('getTaskPolicies')` block (modify)
- `apps/app/src/app/(app)/[orgId]/policies/[policyId]/hooks/usePolicyEvidenceTasks.ts`
- `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyEvidenceTasks.tsx`
- `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyEvidenceTasks.test.tsx`
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/hooks/use-task-policies.ts`
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/TaskPolicies.tsx`
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/TaskPolicies.test.tsx`

### Modified

- `apps/api/src/policies/policies.controller.ts` — add `GET :id/evidence-tasks`
- `apps/api/src/tasks/tasks.controller.ts` — add `GET :taskId/policies`
- `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyPageTabs.tsx` — render `<PolicyEvidenceTasks />` in the Overview tab
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/SingleTask.tsx` — render `<TaskPolicies />` in the Overview tab

---

## Shared Types

Both endpoints return the same grouped shape. Define these in each controller test using the types below and mirror them in the frontend hooks. Copy-paste verbatim; do not DRY across packages unless the codebase already shares a types package for API responses.

```ts
// Group shape from GET /v1/policies/:id/evidence-tasks
type PolicyEvidenceTaskGroup = {
  control: { id: string; name: string };
  tasks: Array<{
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'not_relevant' | 'failed';
    frequency: 'monthly' | 'quarterly' | 'yearly' | null;
    department: string | null;
    automationStatus: 'AUTOMATED' | 'MANUAL';
    assigneeId: string | null;
  }>;
};

// Group shape from GET /v1/tasks/:taskId/policies
type TaskPolicyGroup = {
  control: { id: string; name: string };
  policies: Array<{
    id: string;
    name: string;
    status: 'draft' | 'published' | 'needs_review' | 'archived';
    frequency: 'monthly' | 'quarterly' | 'yearly' | null;
    department: string | null;
  }>;
};
```

Note: use the actual `TaskStatus`, `Frequency`, `Department`, `AutomationStatus`, `PolicyStatus` enums from `@db` inside the real code. The literal unions above are for copy-paste clarity.

---

## Task 1: API — `GET /v1/policies/:id/evidence-tasks`

**Files:**
- Modify: `apps/api/src/policies/policies.controller.ts`
- Modify: `apps/api/src/policies/policies.controller.spec.ts`

### Step 1.1: Write the failing test

Open `apps/api/src/policies/policies.controller.spec.ts` and add a new describe block. Scroll to the bottom of the existing `describe('PoliciesController', ...)` body, right before the final `});` closing brace. Add the following block verbatim, replacing `orgId`, `controller`, `mockAuthContext` references with whatever names the file already uses (the existing `describe('getPolicyControls', ...)` block shows the convention).

- [ ] **Step 1.1:** Append the test block

```typescript
describe('getPolicyEvidenceTasks', () => {
  it('returns tasks grouped by control, excluding archived tasks', async () => {
    const { db } = require('@db');
    db.policy.findFirst.mockResolvedValue({
      id: 'pol_1',
      controls: [
        {
          id: 'ctl_1',
          name: 'Access Controls',
          tasks: [
            {
              id: 'tsk_1',
              title: 'Enable 2FA',
              status: 'in_progress',
              frequency: 'monthly',
              department: 'it',
              automationStatus: 'MANUAL',
              assigneeId: 'mem_1',
            },
          ],
        },
        {
          id: 'ctl_2',
          name: 'Monitoring',
          tasks: [],
        },
      ],
    });

    const result = await controller.getPolicyEvidenceTasks(
      'pol_1',
      orgId,
      mockAuthContext,
    );

    expect(db.policy.findFirst).toHaveBeenCalledWith({
      where: { id: 'pol_1', organizationId: orgId, archivedAt: null },
      select: expect.objectContaining({
        id: true,
        controls: expect.objectContaining({
          where: { archivedAt: null },
        }),
      }),
    });
    expect(result.data).toEqual([
      {
        control: { id: 'ctl_1', name: 'Access Controls' },
        tasks: [
          {
            id: 'tsk_1',
            title: 'Enable 2FA',
            status: 'in_progress',
            frequency: 'monthly',
            department: 'it',
            automationStatus: 'MANUAL',
            assigneeId: 'mem_1',
          },
        ],
      },
      {
        control: { id: 'ctl_2', name: 'Monitoring' },
        tasks: [],
      },
    ]);
    expect(result.count).toBe(1);
    expect(result.authType).toBe('session');
  });

  it('throws NotFoundException when policy is not in caller org', async () => {
    const { db } = require('@db');
    db.policy.findFirst.mockResolvedValue(null);

    await expect(
      controller.getPolicyEvidenceTasks('pol_404', orgId, mockAuthContext),
    ).rejects.toThrow('Policy not found');
  });
});
```

- [ ] **Step 1.2:** Run the test and confirm failure

```bash
cd apps/api && npx jest src/policies/policies.controller.spec.ts -t "getPolicyEvidenceTasks"
```

Expected: both tests fail with `TypeError: controller.getPolicyEvidenceTasks is not a function`.

### Step 1.3: Implement the endpoint

Open `apps/api/src/policies/policies.controller.ts`. Find the existing `getPolicyControls` method (search for `@Get(':id/controls')`). Insert the new endpoint immediately after `getPolicyControls`, before the next method. Ensure `NotFoundException` is imported from `@nestjs/common` (it is already imported in most controllers; add it to the import line if missing).

- [ ] **Step 1.3:** Add the endpoint

```typescript
@Get(':id/evidence-tasks')
@RequirePermission('policy', 'read')
@ApiOperation({ summary: 'Get tasks that serve as evidence for a policy, grouped by control' })
@ApiParam(POLICY_PARAMS.policyId)
async getPolicyEvidenceTasks(
  @Param('id') id: string,
  @OrganizationId() organizationId: string,
  @AuthContext() authContext: AuthContextType,
) {
  const policy = await db.policy.findFirst({
    where: { id, organizationId, archivedAt: null },
    select: {
      id: true,
      controls: {
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          tasks: {
            where: { archivedAt: null },
            select: {
              id: true,
              title: true,
              status: true,
              frequency: true,
              department: true,
              automationStatus: true,
              assigneeId: true,
            },
            orderBy: { title: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!policy) {
    throw new NotFoundException('Policy not found');
  }

  const data = policy.controls.map((control) => ({
    control: { id: control.id, name: control.name },
    tasks: control.tasks,
  }));

  const uniqueTaskIds = new Set<string>();
  for (const group of data) {
    for (const task of group.tasks) uniqueTaskIds.add(task.id);
  }

  return {
    data,
    count: uniqueTaskIds.size,
    authType: authContext.authType,
    ...(authContext.userId && {
      authenticatedUser: {
        id: authContext.userId,
        email: authContext.userEmail,
      },
    }),
  };
}
```

- [ ] **Step 1.4:** Run the test and confirm it passes

```bash
cd apps/api && npx jest src/policies/policies.controller.spec.ts -t "getPolicyEvidenceTasks"
```

Expected: both tests PASS.

- [ ] **Step 1.5:** Commit

```bash
git add apps/api/src/policies/policies.controller.ts apps/api/src/policies/policies.controller.spec.ts
git commit -m "feat(api): add GET /v1/policies/:id/evidence-tasks"
```

---

## Task 2: API — `GET /v1/tasks/:taskId/policies`

**Files:**
- Modify: `apps/api/src/tasks/tasks.controller.ts`
- Modify: `apps/api/src/tasks/tasks.controller.spec.ts`

### Step 2.1: Write the failing test

Append to `apps/api/src/tasks/tasks.controller.spec.ts`, after the existing `describe('getTask', ...)` block:

- [ ] **Step 2.1:** Add the test block

```typescript
describe('getTaskPolicies', () => {
  it('returns policies grouped by control, filtering drafts and archived', async () => {
    const { db } = require('@db');
    db.task.findFirst.mockResolvedValue({
      id: 'tsk_1',
      controls: [
        {
          id: 'ctl_1',
          name: 'Access Controls',
          policies: [
            {
              id: 'pol_1',
              name: 'Authentication Policy',
              status: 'published',
              frequency: 'yearly',
              department: 'it',
            },
          ],
        },
      ],
    });

    const result = await controller.getTaskPolicies(
      orgId,
      'tsk_1',
      authContext,
    );

    expect(db.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'tsk_1', organizationId: orgId, archivedAt: null },
      select: expect.objectContaining({
        id: true,
        controls: expect.objectContaining({
          where: { archivedAt: null },
        }),
      }),
    });
    expect(result.data).toEqual([
      {
        control: { id: 'ctl_1', name: 'Access Controls' },
        policies: [
          {
            id: 'pol_1',
            name: 'Authentication Policy',
            status: 'published',
            frequency: 'yearly',
            department: 'it',
          },
        ],
      },
    ]);
    expect(result.count).toBe(1);
  });

  it('throws NotFoundException when task is not in caller org', async () => {
    const { db } = require('@db');
    db.task.findFirst.mockResolvedValue(null);

    await expect(
      controller.getTaskPolicies(orgId, 'tsk_404', authContext),
    ).rejects.toThrow('Task not found');
  });
});
```

Ensure the `jest.mock('@db', ...)` block at the top of the file includes `task: { findFirst: jest.fn(), ... }`. Add `findFirst: jest.fn(),` to the existing `task` mock entry if missing.

- [ ] **Step 2.2:** Run the test and confirm failure

```bash
cd apps/api && npx jest src/tasks/tasks.controller.spec.ts -t "getTaskPolicies"
```

Expected: fails with `controller.getTaskPolicies is not a function`.

### Step 2.3: Implement the endpoint

In `apps/api/src/tasks/tasks.controller.ts`, add the endpoint alongside the existing `getTask`. Use the `:taskId` param name to match the existing controller convention.

- [ ] **Step 2.3:** Add the endpoint

```typescript
@Get(':taskId/policies')
@UseGuards(PermissionGuard)
@RequirePermission('task', 'read')
@ApiOperation({ summary: 'Get policies that reference a task via shared controls' })
@ApiParam({ name: 'taskId', description: 'Unique task identifier', example: 'tsk_abc123def456' })
async getTaskPolicies(
  @OrganizationId() organizationId: string,
  @Param('taskId') taskId: string,
  @AuthContext() authContext: AuthContextType,
) {
  const task = await db.task.findFirst({
    where: { id: taskId, organizationId, archivedAt: null },
    select: {
      id: true,
      controls: {
        where: { archivedAt: null },
        select: {
          id: true,
          name: true,
          policies: {
            where: { archivedAt: null, status: 'published' },
            select: {
              id: true,
              name: true,
              status: true,
              frequency: true,
              department: true,
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!task) {
    throw new NotFoundException('Task not found');
  }

  const data = task.controls.map((control) => ({
    control: { id: control.id, name: control.name },
    policies: control.policies,
  }));

  const uniquePolicyIds = new Set<string>();
  for (const group of data) {
    for (const policy of group.policies) uniquePolicyIds.add(policy.id);
  }

  return {
    data,
    count: uniquePolicyIds.size,
    authType: authContext.authType,
    ...(authContext.userId && {
      authenticatedUser: {
        id: authContext.userId,
        email: authContext.userEmail,
      },
    }),
  };
}
```

Ensure these imports exist at the top of the file: `NotFoundException` from `@nestjs/common`, and `db` from `@db`. If `db` is not yet imported (the existing controller may go through `TasksService`), add:

```typescript
import { db } from '@db';
```

- [ ] **Step 2.4:** Run the test and confirm it passes

```bash
cd apps/api && npx jest src/tasks/tasks.controller.spec.ts -t "getTaskPolicies"
```

Expected: both tests PASS.

- [ ] **Step 2.5:** Typecheck API

```bash
npx turbo run typecheck --filter=@trycompai/api
```

Expected: no errors.

- [ ] **Step 2.6:** Commit

```bash
git add apps/api/src/tasks/tasks.controller.ts apps/api/src/tasks/tasks.controller.spec.ts
git commit -m "feat(api): add GET /v1/tasks/:taskId/policies"
```

---

## Task 3: Hook — `usePolicyEvidenceTasks`

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/hooks/usePolicyEvidenceTasks.ts`

SWR wrappers don't need a dedicated test — the component test will exercise them. No red/green cycle here.

- [ ] **Step 3.1:** Create the hook

```typescript
'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

type TaskSummary = {
  id: string;
  title: string;
  status: string;
  frequency: string | null;
  department: string | null;
  automationStatus: 'AUTOMATED' | 'MANUAL';
  assigneeId: string | null;
};

export type PolicyEvidenceTaskGroup = {
  control: { id: string; name: string };
  tasks: TaskSummary[];
};

type ApiResponse = {
  data: PolicyEvidenceTaskGroup[];
  count: number;
};

export const policyEvidenceTasksKey = (policyId: string, organizationId: string) =>
  ['/v1/policies/evidence-tasks', policyId, organizationId] as const;

interface UsePolicyEvidenceTasksOptions {
  policyId: string;
  organizationId: string;
  initialData?: { data: PolicyEvidenceTaskGroup[]; count: number } | null;
}

export function usePolicyEvidenceTasks({
  policyId,
  organizationId,
  initialData,
}: UsePolicyEvidenceTasksOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    policyEvidenceTasksKey(policyId, organizationId),
    async () => {
      const response = await apiClient.get<ApiResponse>(
        `/v1/policies/${policyId}/evidence-tasks`,
      );
      if (response.error) throw new Error(response.error);
      return response.data ?? { data: [], count: 0 };
    },
    {
      fallbackData: initialData ?? undefined,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  return {
    groups: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}
```

- [ ] **Step 3.2:** Commit

```bash
git add apps/app/src/app/\(app\)/\[orgId\]/policies/\[policyId\]/hooks/usePolicyEvidenceTasks.ts
git commit -m "feat(app): add usePolicyEvidenceTasks hook"
```

---

## Task 4: Hook — `use-task-policies`

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/hooks/use-task-policies.ts`

Uses kebab-case filename to match the existing task-hook convention (see `use-task.ts`, `use-task-automations.ts`).

- [ ] **Step 4.1:** Create the hook

```typescript
'use client';

import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

type PolicySummary = {
  id: string;
  name: string;
  status: string;
  frequency: string | null;
  department: string | null;
};

export type TaskPolicyGroup = {
  control: { id: string; name: string };
  policies: PolicySummary[];
};

type ApiResponse = {
  data: TaskPolicyGroup[];
  count: number;
};

export const taskPoliciesKey = (taskId: string, organizationId: string) =>
  ['/v1/tasks/policies', taskId, organizationId] as const;

interface UseTaskPoliciesOptions {
  taskId: string;
  organizationId: string;
  initialData?: { data: TaskPolicyGroup[]; count: number } | null;
}

export function useTaskPolicies({
  taskId,
  organizationId,
  initialData,
}: UseTaskPoliciesOptions) {
  const { data, error, isLoading, mutate } = useSWR(
    taskPoliciesKey(taskId, organizationId),
    async () => {
      const response = await apiClient.get<ApiResponse>(
        `/v1/tasks/${taskId}/policies`,
      );
      if (response.error) throw new Error(response.error);
      return response.data ?? { data: [], count: 0 };
    },
    {
      fallbackData: initialData ?? undefined,
      revalidateOnMount: !initialData,
      revalidateOnFocus: false,
    },
  );

  return {
    groups: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading: isLoading && !data,
    error,
    mutate,
  };
}
```

- [ ] **Step 4.2:** Commit

```bash
git add apps/app/src/app/\(app\)/\[orgId\]/tasks/\[taskId\]/hooks/use-task-policies.ts
git commit -m "feat(app): add useTaskPolicies hook"
```

---

## Task 5: Component — `PolicyEvidenceTasks`

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyEvidenceTasks.test.tsx`
- Create: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyEvidenceTasks.tsx`

### Step 5.1: Write failing tests

- [ ] **Step 5.1:** Create the test file

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PolicyEvidenceTasks } from './PolicyEvidenceTasks';
import type { PolicyEvidenceTaskGroup } from '../hooks/usePolicyEvidenceTasks';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1', policyId: 'pol_1' }),
}));

const mockHook = vi.fn();
vi.mock('../hooks/usePolicyEvidenceTasks', () => ({
  usePolicyEvidenceTasks: (...args: unknown[]) => mockHook(...args),
}));

const makeTask = (overrides: Partial<PolicyEvidenceTaskGroup['tasks'][number]> = {}) => ({
  id: 'tsk_1',
  title: 'Enable 2FA',
  status: 'in_progress',
  frequency: 'monthly',
  department: 'it',
  automationStatus: 'MANUAL' as const,
  assigneeId: null,
  ...overrides,
});

describe('PolicyEvidenceTasks', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders one section per control group with task rows', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          tasks: [makeTask(), makeTask({ id: 'tsk_2', title: 'Review access logs' })],
        },
        {
          control: { id: 'ctl_2', name: 'Monitoring' },
          tasks: [makeTask({ id: 'tsk_3', title: 'Check alerts' })],
        },
      ],
      count: 3,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    expect(screen.getByText('Access Controls')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Enable 2FA')).toBeInTheDocument();
    expect(screen.getByText('Review access logs')).toBeInTheDocument();
    expect(screen.getByText('Check alerts')).toBeInTheDocument();
  });

  it('shows page-level empty state when policy has no controls', () => {
    mockHook.mockReturnValue({ groups: [], count: 0, isLoading: false });

    render(<PolicyEvidenceTasks />);

    expect(
      screen.getByText(/map at least one control/i),
    ).toBeInTheDocument();
  });

  it('shows per-group empty state when a control has no tasks', () => {
    mockHook.mockReturnValue({
      groups: [{ control: { id: 'ctl_1', name: 'Access Controls' }, tasks: [] }],
      count: 0,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    expect(
      screen.getByText(/no tasks attached to this control/i),
    ).toBeInTheDocument();
  });

  it('task row links to the task detail page', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          tasks: [makeTask({ id: 'tsk_42', title: 'Enable 2FA' })],
        },
      ],
      count: 1,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    const link = screen.getByRole('link', { name: /Enable 2FA/ });
    expect(link).toHaveAttribute('href', '/org_1/tasks/tsk_42');
  });

  it('collapses groups with more than 5 tasks by default', async () => {
    const manyTasks = Array.from({ length: 7 }, (_, i) =>
      makeTask({ id: `tsk_${i}`, title: `Task ${i}` }),
    );
    mockHook.mockReturnValue({
      groups: [{ control: { id: 'ctl_1', name: 'Access Controls' }, tasks: manyTasks }],
      count: 7,
      isLoading: false,
    });

    render(<PolicyEvidenceTasks />);

    // By default, task titles should not be visible
    expect(screen.queryByText('Task 0')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /show 7 tasks/i });
    await userEvent.click(toggle);

    expect(screen.getByText('Task 0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5.2:** Run tests and confirm failure

```bash
cd apps/app && npx vitest run src/app/\(app\)/\[orgId\]/policies/\[policyId\]/components/PolicyEvidenceTasks.test.tsx
```

Expected: all tests fail with `Cannot find module './PolicyEvidenceTasks'`.

### Step 5.3: Implement the component

- [ ] **Step 5.3:** Create the component

```tsx
'use client';

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  HStack,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  usePolicyEvidenceTasks,
  type PolicyEvidenceTaskGroup,
} from '../hooks/usePolicyEvidenceTasks';

const COLLAPSE_THRESHOLD = 5;

export function PolicyEvidenceTasks() {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const { groups, count, isLoading } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  if (isLoading) {
    return (
      <Section
        title="Evidence Tasks"
        description="Tasks attached to the controls mapped to this policy."
      >
        <Text>Loading...</Text>
      </Section>
    );
  }

  if (groups.length === 0) {
    return (
      <Section
        title="Evidence Tasks"
        description="Tasks attached to the controls mapped to this policy."
      >
        <Text>
          Map at least one control to see the tasks that demonstrate this policy.
        </Text>
      </Section>
    );
  }

  return (
    <Section
      title="Evidence Tasks"
      description={`${count} task${count === 1 ? '' : 's'} attached to the controls mapped to this policy.`}
    >
      <Stack gap="4">
        {groups.map((group) => (
          <ControlGroup key={group.control.id} group={group} orgId={orgId} />
        ))}
      </Stack>
    </Section>
  );
}

function ControlGroup({
  group,
  orgId,
}: {
  group: PolicyEvidenceTaskGroup;
  orgId: string;
}) {
  const { control, tasks } = group;

  if (tasks.length === 0) {
    return (
      <Stack gap="2">
        <Text weight="medium">{control.name}</Text>
        <Text size="sm" tone="muted">
          No tasks attached to this control.
        </Text>
      </Stack>
    );
  }

  if (tasks.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <HStack justify="between" align="center">
          <Text weight="medium">{control.name}</Text>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              Show {tasks.length} tasks
            </Button>
          </CollapsibleTrigger>
        </HStack>
        <CollapsibleContent>
          <TaskList tasks={tasks} orgId={orgId} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Stack gap="2">
      <Text weight="medium">{control.name}</Text>
      <TaskList tasks={tasks} orgId={orgId} />
    </Stack>
  );
}

function TaskList({
  tasks,
  orgId,
}: {
  tasks: PolicyEvidenceTaskGroup['tasks'];
  orgId: string;
}) {
  return (
    <Stack gap="1">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/${orgId}/tasks/${task.id}`}
          className="block rounded px-3 py-2 hover:bg-muted"
        >
          <HStack justify="between" align="center">
            <Text>{task.title}</Text>
            <HStack gap="2">
              <Badge>{task.status}</Badge>
              {task.frequency ? <Badge>{task.frequency}</Badge> : null}
            </HStack>
          </HStack>
        </Link>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 5.4:** Run tests and confirm they pass

```bash
cd apps/app && npx vitest run src/app/\(app\)/\[orgId\]/policies/\[policyId\]/components/PolicyEvidenceTasks.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 5.5:** Run the design-system audit

```bash
# From the repo root
```

Invoke the `audit-design-system` skill. Fix any `@trycompai/ui` or `lucide-react` imports it surfaces. Re-run the test suite after any edits.

- [ ] **Step 5.6:** Commit

```bash
git add apps/app/src/app/\(app\)/\[orgId\]/policies/\[policyId\]/components/PolicyEvidenceTasks.tsx apps/app/src/app/\(app\)/\[orgId\]/policies/\[policyId\]/components/PolicyEvidenceTasks.test.tsx
git commit -m "feat(app): add PolicyEvidenceTasks component"
```

---

## Task 6: Component — `TaskPolicies`

**Files:**
- Create: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/TaskPolicies.test.tsx`
- Create: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/TaskPolicies.tsx`

Mirror of Task 5. Same mocking pattern, same collapse behavior, draft/archived policies must be filtered defensively in the component (the API already filters, but defense in depth — tested explicitly).

### Step 6.1: Write failing tests

- [ ] **Step 6.1:** Create the test file

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskPolicies } from './TaskPolicies';
import type { TaskPolicyGroup } from '../hooks/use-task-policies';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1', taskId: 'tsk_1' }),
}));

const mockHook = vi.fn();
vi.mock('../hooks/use-task-policies', () => ({
  useTaskPolicies: (...args: unknown[]) => mockHook(...args),
}));

const makePolicy = (overrides: Partial<TaskPolicyGroup['policies'][number]> = {}) => ({
  id: 'pol_1',
  name: 'Authentication Policy',
  status: 'published',
  frequency: 'yearly',
  department: 'it',
  ...overrides,
});

describe('TaskPolicies', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('renders one section per control group with policy rows', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [makePolicy(), makePolicy({ id: 'pol_2', name: 'MFA Policy' })],
        },
      ],
      count: 2,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.getByText('Access Controls')).toBeInTheDocument();
    expect(screen.getByText('Authentication Policy')).toBeInTheDocument();
    expect(screen.getByText('MFA Policy')).toBeInTheDocument();
  });

  it('shows empty state when task has no linked controls', () => {
    mockHook.mockReturnValue({ groups: [], count: 0, isLoading: false });

    render(<TaskPolicies />);

    expect(
      screen.getByText(/no policies reference this task/i),
    ).toBeInTheDocument();
  });

  it('filters out policies that are not published, defensively', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [
            makePolicy({ id: 'pol_1', status: 'published', name: 'Published One' }),
            makePolicy({ id: 'pol_2', status: 'draft', name: 'Draft One' }),
            makePolicy({ id: 'pol_3', status: 'archived', name: 'Archived One' }),
          ],
        },
      ],
      count: 1,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.getByText('Published One')).toBeInTheDocument();
    expect(screen.queryByText('Draft One')).not.toBeInTheDocument();
    expect(screen.queryByText('Archived One')).not.toBeInTheDocument();
  });

  it('policy row links to the policy detail page', () => {
    mockHook.mockReturnValue({
      groups: [
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          policies: [makePolicy({ id: 'pol_42', name: 'Authentication Policy' })],
        },
      ],
      count: 1,
      isLoading: false,
    });

    render(<TaskPolicies />);

    const link = screen.getByRole('link', { name: /Authentication Policy/ });
    expect(link).toHaveAttribute('href', '/org_1/policies/pol_42');
  });

  it('collapses groups with more than 5 policies by default', async () => {
    const manyPolicies = Array.from({ length: 7 }, (_, i) =>
      makePolicy({ id: `pol_${i}`, name: `Policy ${i}` }),
    );
    mockHook.mockReturnValue({
      groups: [{ control: { id: 'ctl_1', name: 'Access Controls' }, policies: manyPolicies }],
      count: 7,
      isLoading: false,
    });

    render(<TaskPolicies />);

    expect(screen.queryByText('Policy 0')).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', { name: /show 7 policies/i });
    await userEvent.click(toggle);

    expect(screen.getByText('Policy 0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6.2:** Run tests and confirm failure

```bash
cd apps/app && npx vitest run src/app/\(app\)/\[orgId\]/tasks/\[taskId\]/components/TaskPolicies.test.tsx
```

Expected: all tests fail with `Cannot find module './TaskPolicies'`.

### Step 6.3: Implement the component

- [ ] **Step 6.3:** Create the component

```tsx
'use client';

import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  HStack,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useTaskPolicies,
  type TaskPolicyGroup,
} from '../hooks/use-task-policies';

const COLLAPSE_THRESHOLD = 5;

export function TaskPolicies() {
  const { orgId, taskId } = useParams<{ orgId: string; taskId: string }>();
  const { groups, count, isLoading } = useTaskPolicies({
    taskId,
    organizationId: orgId,
  });

  // Defensive filter: never render non-published policies even if the API
  // regresses and returns them.
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      policies: group.policies.filter((p) => p.status === 'published'),
    }))
    .filter((group) => group.policies.length > 0);

  if (isLoading) {
    return (
      <Section
        title="Policies"
        description="Policies whose controls this task demonstrates."
      >
        <Text>Loading...</Text>
      </Section>
    );
  }

  if (visibleGroups.length === 0) {
    return (
      <Section
        title="Policies"
        description="Policies whose controls this task demonstrates."
      >
        <Text>No policies reference this task through its mapped controls.</Text>
      </Section>
    );
  }

  return (
    <Section
      title="Policies"
      description={`${count} polic${count === 1 ? 'y' : 'ies'} whose controls this task demonstrates.`}
    >
      <Stack gap="4">
        {visibleGroups.map((group) => (
          <ControlGroup key={group.control.id} group={group} orgId={orgId} />
        ))}
      </Stack>
    </Section>
  );
}

function ControlGroup({
  group,
  orgId,
}: {
  group: TaskPolicyGroup;
  orgId: string;
}) {
  const { control, policies } = group;

  if (policies.length > COLLAPSE_THRESHOLD) {
    return (
      <Collapsible>
        <HStack justify="between" align="center">
          <Text weight="medium">{control.name}</Text>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              Show {policies.length} policies
            </Button>
          </CollapsibleTrigger>
        </HStack>
        <CollapsibleContent>
          <PolicyList policies={policies} orgId={orgId} />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Stack gap="2">
      <Text weight="medium">{control.name}</Text>
      <PolicyList policies={policies} orgId={orgId} />
    </Stack>
  );
}

function PolicyList({
  policies,
  orgId,
}: {
  policies: TaskPolicyGroup['policies'];
  orgId: string;
}) {
  return (
    <Stack gap="1">
      {policies.map((policy) => (
        <Link
          key={policy.id}
          href={`/${orgId}/policies/${policy.id}`}
          className="block rounded px-3 py-2 hover:bg-muted"
        >
          <HStack justify="between" align="center">
            <Text>{policy.name}</Text>
            <HStack gap="2">
              <Badge>{policy.status}</Badge>
              {policy.frequency ? <Badge>{policy.frequency}</Badge> : null}
            </HStack>
          </HStack>
        </Link>
      ))}
    </Stack>
  );
}
```

- [ ] **Step 6.4:** Run tests and confirm they pass

```bash
cd apps/app && npx vitest run src/app/\(app\)/\[orgId\]/tasks/\[taskId\]/components/TaskPolicies.test.tsx
```

Expected: all 5 tests PASS.

- [ ] **Step 6.5:** Run the design-system audit

Invoke the `audit-design-system` skill. Fix any flagged imports.

- [ ] **Step 6.6:** Commit

```bash
git add apps/app/src/app/\(app\)/\[orgId\]/tasks/\[taskId\]/components/TaskPolicies.tsx apps/app/src/app/\(app\)/\[orgId\]/tasks/\[taskId\]/components/TaskPolicies.test.tsx
git commit -m "feat(app): add TaskPolicies component"
```

---

## Task 7: Integrate into Policy Overview tab

**Files:**
- Modify: `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyPageTabs.tsx`

- [ ] **Step 7.1:** Open the file and find the Overview `TabsContent` block

Search for `<TabsContent value="overview">` (around line 191). Inside it, find the `<PolicyControlMappings ... />` render and insert `<PolicyEvidenceTasks />` **immediately after** it, inside the same parent stack.

Add the import at the top of the file:

```typescript
import { PolicyEvidenceTasks } from './PolicyEvidenceTasks';
```

And in the Overview body, after `<PolicyControlMappings ... />`:

```tsx
<PolicyEvidenceTasks />
```

- [ ] **Step 7.2:** Typecheck the app

```bash
npx turbo run typecheck --filter=@trycompai/app
```

Expected: no errors.

- [ ] **Step 7.3:** Commit

```bash
git add apps/app/src/app/\(app\)/\[orgId\]/policies/\[policyId\]/components/PolicyPageTabs.tsx
git commit -m "feat(app): render PolicyEvidenceTasks on policy overview"
```

---

## Task 8: Integrate into Task Overview tab

**Files:**
- Modify: `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/SingleTask.tsx`

- [ ] **Step 8.1:** Open the file and find the Overview `TabsContent` block

Search for `<TabsContent value="overview">` (around line 320). At the bottom of the overview content (after any existing related-controls block), add `<TaskPolicies />`.

Add the import at the top:

```typescript
import { TaskPolicies } from './TaskPolicies';
```

Inside the overview `TabsContent`, below the existing content:

```tsx
<TaskPolicies />
```

- [ ] **Step 8.2:** Typecheck the app

```bash
npx turbo run typecheck --filter=@trycompai/app
```

Expected: no errors.

- [ ] **Step 8.3:** Commit

```bash
git add apps/app/src/app/\(app\)/\[orgId\]/tasks/\[taskId\]/components/SingleTask.tsx
git commit -m "feat(app): render TaskPolicies on task overview"
```

---

## Task 9: Final verification

- [ ] **Step 9.1:** Full typecheck

```bash
npx turbo run typecheck --filter=@trycompai/app --filter=@trycompai/api
```

Expected: no errors.

- [ ] **Step 9.2:** Full API test suite for touched modules

```bash
cd apps/api && npx jest src/policies src/tasks
```

Expected: all tests PASS.

- [ ] **Step 9.3:** Full app test suite for touched files

```bash
cd apps/app && npx vitest run src/app/\(app\)/\[orgId\]/policies src/app/\(app\)/\[orgId\]/tasks
```

Expected: all tests PASS.

- [ ] **Step 9.4:** Manual smoke — policy → evidence

Start the app (`bun run --filter '@trycompai/app' dev:no-trigger`) and the API (`bun run --filter '@trycompai/api' dev:no-trigger`). Log in, then:

1. Open a policy that already has mapped controls → see "Evidence Tasks" section below "Map Controls". Tasks are grouped by control.
2. Click a task row → land on the task page, see "Policies" section listing the original policy.
3. Open a policy with no controls mapped → see the nudge text.
4. Map a new control to a policy → the Evidence Tasks section updates on its next SWR revalidation.

- [ ] **Step 9.5:** Manual smoke — archive behavior

1. Archive a task via the task settings tab → refresh the policy page. The task disappears from Evidence Tasks.
2. Change a policy status back to `draft` → refresh the task page. The policy disappears from the Policies section.

- [ ] **Step 9.6:** Final commit (if audit-design-system made changes)

If the audit skill edited any files in later iterations, commit those now:

```bash
git add -A
git commit -m "chore(app): design system audit fixes"
```

- [ ] **Step 9.7:** Push the branch and open a PR

Ask the user before pushing. Once approved:

```bash
git push -u origin mariano/sale-48-policies-evidence
gh pr create --title "feat: show evidence tasks on policies and linked policies on tasks (SALE-48)" --body "..."
```

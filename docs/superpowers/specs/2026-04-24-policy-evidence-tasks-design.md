# Policy Evidence Tasks — Design

**Linear:** [SALE-48 — Policies: see the evidence linked to each policy](https://linear.app/compai/issue/SALE-48/policies-see-the-evidence-linked-to-each-policy)
**Branch:** `mariano/sale-48-policies-evidence`
**Date:** 2026-04-24

## Problem

Trial users (Secureframe and Drata migrations) expect the Policy page to answer: *"What evidence do we have to demonstrate this policy is implemented?"* Today the answer requires clicking out to each mapped Control, opening it, and reading its Tasks. That's the "5 layers of digging" complaint in the ticket.

The inverse navigation is also missing: from a Task, there is no way to see which policies it demonstrates.

## Goal

- On a Policy page, show the Tasks that serve as evidence for that policy, grouped by the Control that connects them — one click deep from Overview.
- On a Task page, mirror it: show the Policies that reference this task via shared controls.
- Read-only surfaces. Linking is still managed through the existing Policy ↔ Control mapping.

## Non-goals

- Adding a direct `Policy ↔ Task` relation. Decided against — see *"Why transitive via Control"* below.
- Editing tasks from the policy page or vice versa. Navigation only.
- Pagination. Bounded list sizes make this unnecessary.
- Exposing draft/archived policies outside their own detail page.

## Why transitive via Control (not a direct M2M)

The existing schema already encodes the relationship:

- `Policy.controls` (M2M) and `Task.controls` (M2M) are both implicit relations through `Control`.
- `Control` is the compliance anchor — it's what gets mapped to `RequirementMap → FrameworkInstance → Framework`. Audit traceability flows through Control.
- A Task that is "evidence for" a Policy, by definition, implements a Control that the Policy satisfies. The catalog mirrors this: `FrameworkEditorControlTemplate` joins `PolicyTemplate` and `TaskTemplate` through itself, not directly.

A direct `Policy ↔ Task` relation would:

1. Allow users to link a task to a policy without sharing a control, silently breaking the framework mapping.
2. Create two sources of truth for "this task demonstrates this policy."
3. Require framework-sync logic to reason about an extra edge when archiving templates.

If ad-hoc citation is ever needed, that is a separate "see also" relation — out of scope here.

## Architecture

**No schema changes.** Two new read-only API endpoints compute the transitive set at query time. Two new UI sections render the result, one on the Policy Overview tab and one on the Task Overview tab.

### Derivation

For a given policy:

```
policy.controls (not archived)
  └─ each control's tasks (not archived)
       → group by control, return { control, tasks[] }[]
```

For a given task (inverse):

```
task.controls (not archived)
  └─ each control's policies (not archived, status = published)
       → group by control, return { control, policies[] }[]
```

The UI groups by Control so the user sees *why* each task/policy is related (which control bridges them). Dedupe is intentionally not performed server-side: a task attached to two controls on the same policy shows under both groups.

### Scoping & safety

- Org scoping via authenticated session on every query (`organizationId` filter on root).
- `archivedAt: null` on Policy, Task, and Control joins — framework-sync archives cascade here.
- Task → Policies endpoint filters `Policy.status = 'published'`. Policy → Tasks does not filter by status (the user is viewing their own policy).
- Both endpoints gate with `@RequirePermission('policy','read')` / `('task','read')`. AuditLogInterceptor handles read logging automatically.

### Performance

Policies and tasks typically have <10 controls; controls typically have <20 of each side. A single Prisma `include` is sufficient. No caching, no materialized view, no pagination.

## API

### `GET /v1/policies/:id/evidence-tasks`

**Controller:** `apps/api/src/policies/policies.controller.ts`
**Guards:** `HybridAuthGuard`, `PermissionGuard` with `@RequirePermission('policy', 'read')`

**Response:**

```ts
{
  data: Array<{
    control: { id: string; name: string };
    tasks: Array<{
      id: string;
      title: string;
      status: TaskStatus;
      frequency: Frequency | null;
      department: Department | null;
      automationStatus: AutomationStatus;
      assigneeId: string | null;
    }>;
  }>;
  count: number;       // total task rows across groups
  authType: string;
  authenticatedUser: { ... };
}
```

Returns `404` when policy is not in the caller's org.

### `GET /v1/tasks/:id/policies`

**Controller:** `apps/api/src/tasks/tasks.controller.ts` (or equivalent single-task controller)
**Guards:** `HybridAuthGuard`, `PermissionGuard` with `@RequirePermission('task', 'read')`

**Response** (mirror shape):

```ts
{
  data: Array<{
    control: { id: string; name: string };
    policies: Array<{
      id: string;
      name: string;
      status: PolicyStatus;
      frequency: Frequency | null;
      department: Department | null;
    }>;
  }>;
  count: number;
  authType: string;
  authenticatedUser: { ... };
}
```

## Frontend

### New components

- `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyEvidenceTasks.tsx`
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/TaskPolicies.tsx`

### New hooks

- `apps/app/src/hooks/usePolicyEvidenceTasks.ts` — SWR over `GET /v1/policies/:id/evidence-tasks`, accepts `fallbackData`.
- `apps/app/src/hooks/useTaskPolicies.ts` — SWR over `GET /v1/tasks/:id/policies`, accepts `fallbackData`.

### Touched files

- `apps/app/src/app/(app)/[orgId]/policies/[policyId]/components/PolicyPageTabs.tsx` — render `<PolicyEvidenceTasks />` on Overview, directly below `PolicyControlMappings`.
- `apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/SingleTask.tsx` — render `<TaskPolicies />` on Overview, below any related-controls block.

### Rendering

**Policy Evidence Tasks section:**

- Section header: "Evidence Tasks" with count pill, subtitle *"Tasks attached to the controls mapped to this policy."*
- One block per Control group:
  - Control name header.
  - Task rows listing title, status badge, frequency, automation icon, assignee avatar.
  - Row click → `/[orgId]/tasks/[taskId]`.
  - If group has >5 tasks, collapse by default (`Collapsible` from design system), show "Show N tasks".
  - Per-group empty state: *"No tasks attached to this control."* with a link to the control detail page.
- Page-level empty state (policy has no controls mapped): *"Map at least one control to see the tasks that demonstrate this policy."* with an in-page anchor to `PolicyControlMappings`.

**Task Policies section:** mirror structure. Each row shows policy name, status badge, frequency. Row click → `/[orgId]/policies/[policyId]`.

### Design system

- Use `@trycompai/design-system` primitives: `Stack`, `HStack`, `Text`, `Badge`, `Button`, `Collapsible`.
- Icons via `@trycompai/design-system/icons` (Carbon). Never `lucide-react`.
- `Text` / `Stack` / `HStack` / `Badge` / `Button` do not accept `className` — wrap in `<div>` when custom styling is needed.
- Run `audit-design-system` skill after UI is complete.

### Permission gating

Both sections render behind the existing page-level permission guard (`requireRoutePermission`). No per-row gating — all rows are links, no mutations.

## Testing

### API (Jest)

**`policies.controller.spec.ts`** — new describe block for `/evidence-tasks`:

- Returns grouped-by-control shape for a policy with 2 controls.
- Archived tasks excluded.
- Archived controls excluded.
- Org scoping: a user in another org gets 404.
- Task attached to two controls on the same policy appears in both groups (intentional).
- Missing `policy:read` permission → 403 from `PermissionGuard`.

**`tasks.controller.spec.ts`** — mirror describe block for `/policies`:

- Excludes policies with `status !== 'published'`.
- Excludes archived policies.
- Org scoping + permission coverage.

### App (Vitest + Testing Library)

**`PolicyEvidenceTasks.test.tsx`:**

- Renders one section per control group, with task rows under each.
- Page-level empty state when policy has zero controls.
- Per-group empty state when a control has zero tasks.
- Collapses groups with >5 tasks by default; expand reveals them.
- Task row has correct `href` to `/[orgId]/tasks/[taskId]`.
- Loading state renders skeleton.

**`TaskPolicies.test.tsx`:** mirror — plus verify that any accidentally-returned draft/archived policies are filtered defensively in the component.

### Manual smoke

1. Open a policy with 2 mapped controls → see evidence tasks grouped by control.
2. Open an unmapped policy → see nudge to map a control.
3. Click a task → task page's Policies section shows the original policy.
4. Archive a task → task disappears from the policy page on refresh.
5. Unpublish a policy → policy disappears from the task page on refresh.

## Rollout

- Single PR containing backend, frontend, and tests.
- No migration, no feature flag — additive read-only surfaces gated by existing permissions.
- Typecheck: `npx turbo run typecheck --filter=@trycompai/api` and `--filter=@trycompai/app`.
- Run `audit-design-system` before committing UI.

## Open questions

None at spec time. Any new ones surface as plan items.

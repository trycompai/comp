import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModernTaskListItem } from './ModernTaskListItem';
import { TaskList } from './TaskList';
import { TasksByCategory } from './TasksByCategory';

// next/navigation is mocked locally (not via the global setup) so we can add
// useParams (needed by TaskList) and vary the search params per test.
const nav = vi.hoisted(() => ({ search: new URLSearchParams() }));
const nuqs = vi.hoisted(() => ({ assignee: null as string | null }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/org_1/tasks',
  useSearchParams: () => nav.search,
  useParams: () => ({ orgId: 'org_1' }),
  redirect: vi.fn(),
}));

vi.mock('nuqs', () => ({
  useQueryState: (key: string) => [key === 'assignee' ? nuqs.assignee : null, vi.fn()],
}));

type TasksByCategoryProps = Parameters<typeof TasksByCategory>[0];
type CategoryTask = TasksByCategoryProps['tasks'][number];
type MemberWithUser = TasksByCategoryProps['members'][number];

function makeTask(overrides: Partial<CategoryTask> = {}): CategoryTask {
  return {
    id: 'tsk_1',
    title: 'Evidence item',
    description: null,
    status: 'todo',
    assigneeId: 'mem_1',
    controls: [{ id: 'ctl_1', name: 'Access Control' }],
    evidenceAutomations: [],
    ...overrides,
  } as unknown as CategoryTask;
}

function makeMember({
  name,
  email,
  role = 'employee',
}: {
  name: string;
  email: string;
  role?: string;
}): MemberWithUser {
  return {
    id: 'mem_1',
    role,
    user: { id: 'usr_1', name, email, image: null },
  } as unknown as MemberWithUser;
}

afterEach(() => {
  nav.search = new URLSearchParams();
  nuqs.assignee = null;
});

// An employee whose User.name is empty (e.g. "Akmal") must still be identified
// by email instead of rendering blank in the evidence list.
const AKMAL_EMAIL = 'akmal@example.com';

describe('TasksByCategory assignee cell', () => {
  it('falls back to the email when the assignee has no name', () => {
    nav.search = new URLSearchParams('category=ctl_1');

    render(
      <TasksByCategory
        tasks={[makeTask()]}
        members={[makeMember({ name: '', email: AKMAL_EMAIL })]}
      />,
    );

    expect(screen.getByText(AKMAL_EMAIL)).toBeInTheDocument();
  });
});

describe('ModernTaskListItem assignee avatar', () => {
  it('shows the email initial when the assignee has no name', () => {
    render(
      <ModernTaskListItem
        task={makeTask()}
        members={[makeMember({ name: '', email: AKMAL_EMAIL })]}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

describe('TaskList "Everyone" assignee filter', () => {
  it('falls back to the email when the selected assignee has no name', () => {
    nuqs.assignee = 'mem_1';

    render(
      <TaskList
        tasks={[]}
        members={[makeMember({ name: '', email: AKMAL_EMAIL, role: 'owner' })]}
        frameworkInstances={[]}
        activeTab="categories"
      />,
    );

    expect(screen.getByText(AKMAL_EMAIL)).toBeInTheDocument();
  });

  // CS-571: a customer created a custom "SecDev" role (evidence permissions) and
  // assigned users to it. Those assignees were missing from the Assignee filter and
  // showed as "Unassigned" on the overview, because eligibleAssignees narrowed the
  // list to built-in admin/owner roles. Custom roles must surface in the filter just
  // like the task detail sidebar resolves them.
  it('includes a custom-role (SecDev) member in the Assignee filter', () => {
    nuqs.assignee = 'mem_1';

    render(
      <TaskList
        tasks={[]}
        members={[
          makeMember({ name: 'Ana Castro Borda', email: 'ana@example.com', role: 'secdev' }),
        ]}
        frameworkInstances={[]}
        activeTab="categories"
      />,
    );

    // Before the fix the SecDev member was filtered out, leaving eligibleAssignees
    // empty so the trigger rendered "No eligible members" instead of the assignee.
    expect(screen.getByText('Ana Castro Borda')).toBeInTheDocument();
    expect(screen.queryByText('No eligible members')).not.toBeInTheDocument();
  });
});

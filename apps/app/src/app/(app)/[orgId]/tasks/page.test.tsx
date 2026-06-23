import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
vi.mock('@/lib/api-server', () => ({
  serverApi: { get: (url: string) => mockGet(url) },
}));

// app-access resolution (built-in + custom roles) is exercised by its own
// unit; here we stub it to keep everyone except pure employee/contractor so we
// can assert the page delegates filtering to it instead of a role allowlist.
const mockFilterAppAccessMembers = vi.fn();
vi.mock('@/lib/compliance', () => ({
  filterAppAccessMembers: (members: unknown, organizationId: unknown) =>
    mockFilterAppAccessMembers(members, organizationId),
}));

const captured = vi.hoisted(() => ({
  members: null as Array<{ id: string }> | null,
}));
vi.mock('./components/TasksPageClient', () => ({
  TasksPageClient: ({ members }: { members: Array<{ id: string }> }) => {
    captured.members = members;
    return null;
  },
}));

import TasksPage from './page';

const adminMember = {
  id: 'mem_admin',
  role: 'admin',
  user: { id: 'u1', name: 'Admin', email: 'admin@example.com', image: null },
};
const secDevMember = {
  id: 'mem_secdev',
  role: 'SecDev',
  user: { id: 'u2', name: 'Sec Dev', email: 'secdev@example.com', image: null },
};
const employeeMember = {
  id: 'mem_emp',
  role: 'employee',
  user: { id: 'u3', name: 'Employee', email: 'employee@example.com', image: null },
};
const allPeople = [adminMember, secDevMember, employeeMember];

describe('TasksPage member filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.members = null;

    mockGet.mockImplementation((url: string) => {
      if (url === '/v1/people') {
        return Promise.resolve({ data: { data: allPeople, count: allPeople.length } });
      }
      if (url === '/v1/tasks/options') {
        return Promise.resolve({
          data: {
            controls: [],
            frameworkInstances: [],
            organizationName: null,
            hasEvidenceExportAccess: false,
            evidenceApprovalEnabled: false,
          },
        });
      }
      if (url.startsWith('/v1/tasks')) {
        return Promise.resolve({ data: { data: [], count: 0 } });
      }
      return Promise.resolve({ data: undefined });
    });

    mockFilterAppAccessMembers.mockImplementation(
      async (members: Array<{ role: string }>) =>
        members.filter((m) => m.role !== 'employee' && m.role !== 'contractor'),
    );
  });

  // Regression: a custom role (e.g. "SecDev") granting app access was dropped by
  // the old hardcoded ['owner','admin','auditor'] allowlist, so evidence
  // assigned to such a member rendered "Unassigned". Filtering must run through
  // the permission-aware helper instead.
  it('resolves assignable members via app-access permissions, keeping custom roles', async () => {
    const ui = await TasksPage({
      params: Promise.resolve({ orgId: 'org_1' }),
      searchParams: Promise.resolve({}),
    });
    render(ui);

    expect(mockFilterAppAccessMembers).toHaveBeenCalledWith(allPeople, 'org_1');

    const ids = captured.members?.map((m) => m.id) ?? [];
    expect(ids).toContain('mem_secdev');
    expect(ids).toContain('mem_admin');
    expect(ids).not.toContain('mem_emp');
  });
});

import type { Member, User } from '@db';
import { describe, expect, it, vi } from 'vitest';

// Mock @/lib/permissions to avoid resolving @trycompai/auth in the test runtime.
// The mock mirrors the real helpers: parseRolesString splits the comma list and
// isBuiltInRole checks against the built-in role names from @trycompai/auth.
const BUILT_IN_ROLES = new Set(['owner', 'admin', 'auditor', 'employee', 'contractor']);

vi.mock('@/lib/permissions', () => ({
  parseRolesString: (rolesStr: string | null | undefined): string[] => {
    if (!rolesStr) return [];
    return rolesStr
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
  },
  isBuiltInRole: (role: string): boolean => BUILT_IN_ROLES.has(role),
}));

// Import after mock setup
const { filterMembersByOwnerOrAdmin } = await import('./filter-members-by-role');

// Minimal member factory for testing
function makeMember(overrides: { id: string; role: string | null }): Member & { user: User } {
  const { id, role } = overrides;
  return {
    id,
    role,
    organizationId: 'org_1',
    userId: `usr_${id}`,
    createdAt: new Date(),
    department: 'none' as never,
    jobTitle: null,
    isActive: true,
    deactivated: false,
    externalUserId: null,
    externalUserSource: null,
    fleetDmLabelId: null,
    user: {
      id: `usr_${id}`,
      name: `User ${id}`,
      email: `user-${id}@test.com`,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      role: 'user',
      banned: false,
      banReason: null,
      banExpires: null,
      twoFactorEnabled: false,
    },
  } as Member & { user: User };
}

describe('filterMembersByOwnerOrAdmin', () => {
  it('includes members with a custom role (e.g. SecDev) — regression', () => {
    // SecDev is an org-defined custom role; the backend accepts these members as
    // task assignees, so they must remain selectable in the assignee dropdowns.
    const secDev = makeMember({ id: 'mem_secdev', role: 'SecDev' });

    const result = filterMembersByOwnerOrAdmin({ members: [secDev] });

    expect(result.map((m) => m.id)).toContain('mem_secdev');
  });

  it('includes owner and admin members', () => {
    const owner = makeMember({ id: 'mem_owner', role: 'owner' });
    const admin = makeMember({ id: 'mem_admin', role: 'admin' });

    const result = filterMembersByOwnerOrAdmin({ members: [owner, admin] });

    expect(result.map((m) => m.id)).toEqual(['mem_owner', 'mem_admin']);
  });

  it('excludes built-in restricted/auditor roles (employee, contractor, auditor)', () => {
    const employee = makeMember({ id: 'mem_emp', role: 'employee' });
    const contractor = makeMember({ id: 'mem_con', role: 'contractor' });
    const auditor = makeMember({ id: 'mem_aud', role: 'auditor' });

    const result = filterMembersByOwnerOrAdmin({
      members: [employee, contractor, auditor],
    });

    expect(result).toHaveLength(0);
  });

  it('includes a member whose roles combine a built-in restricted role with a custom role', () => {
    const mixed = makeMember({ id: 'mem_mixed', role: 'employee,SecDev' });

    const result = filterMembersByOwnerOrAdmin({ members: [mixed] });

    expect(result.map((m) => m.id)).toContain('mem_mixed');
  });

  it('excludes members with no role', () => {
    const noRole = makeMember({ id: 'mem_none', role: null });

    const result = filterMembersByOwnerOrAdmin({ members: [noRole] });

    expect(result).toHaveLength(0);
  });

  it('always includes the current assignee even if their role is not assignable', () => {
    const employee = makeMember({ id: 'mem_emp', role: 'employee' });

    const result = filterMembersByOwnerOrAdmin({
      members: [employee],
      currentAssigneeId: 'mem_emp',
    });

    expect(result.map((m) => m.id)).toContain('mem_emp');
  });
});

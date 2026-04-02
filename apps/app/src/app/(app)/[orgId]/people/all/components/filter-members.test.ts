import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DisplayItem } from './filter-members';
import type { MemberWithUser } from './TeamMembers';
import type { Invitation } from '@db';

// Mock @/lib/permissions to avoid resolving @trycompai/auth
vi.mock('@/lib/permissions', () => ({
  parseRolesString: (rolesStr: string | null | undefined): string[] => {
    if (!rolesStr) return [];
    return rolesStr
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
  },
}));

// Import after mock setup
const { buildDisplayItems, filterDisplayItems } = await import('./filter-members');

// Minimal member factory for testing
function makeMember(overrides: Partial<MemberWithUser> & { id: string; role: string }): MemberWithUser {
  return {
    organizationId: 'org_1',
    userId: `usr_${overrides.id}`,
    createdAt: new Date(),
    department: 'none' as never,
    jobTitle: null,
    isActive: true,
    deactivated: false,
    externalUserId: null,
    externalUserSource: null,
    fleetDmLabelId: null,
    user: {
      id: `usr_${overrides.id}`,
      name: `User ${overrides.id}`,
      email: `user-${overrides.id}@test.com`,
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
    ...overrides,
  } as MemberWithUser;
}

function makeInvitation(overrides: Partial<Invitation> & { id: string; email: string; role: string }): Invitation {
  return {
    organizationId: 'org_1',
    inviterId: 'usr_inv',
    teamId: null,
    status: 'pending',
    expiresAt: new Date(),
    ...overrides,
  } as Invitation;
}

const activeMember = makeMember({ id: 'mem_1', role: 'employee', isActive: true, deactivated: false });
const deactivatedMember = makeMember({ id: 'mem_2', role: 'admin', isActive: false, deactivated: true });
const inactiveMember = makeMember({ id: 'mem_3', role: 'employee', isActive: false, deactivated: false });
const pendingInvite = makeInvitation({ id: 'inv_1', email: 'pending@test.com', role: 'employee' });

describe('buildDisplayItems', () => {
  it('should mark active members as active', () => {
    const items = buildDisplayItems({ members: [activeMember], pendingInvitations: [] });

    expect(items).toHaveLength(1);
    expect(items[0].displayStatus).toBe('active');
    expect(items[0].type).toBe('member');
    expect(items[0].isDeactivated).toBe(false);
  });

  it('should mark deactivated members as deactivated', () => {
    const items = buildDisplayItems({ members: [deactivatedMember], pendingInvitations: [] });

    expect(items).toHaveLength(1);
    expect(items[0].displayStatus).toBe('deactivated');
    expect(items[0].isDeactivated).toBe(true);
  });

  it('should mark inactive (isActive=false) members as deactivated', () => {
    const items = buildDisplayItems({ members: [inactiveMember], pendingInvitations: [] });

    expect(items).toHaveLength(1);
    expect(items[0].displayStatus).toBe('deactivated');
    expect(items[0].isDeactivated).toBe(true);
  });

  it('should mark pending invitations as pending', () => {
    const items = buildDisplayItems({ members: [], pendingInvitations: [pendingInvite] });

    expect(items).toHaveLength(1);
    expect(items[0].displayStatus).toBe('pending');
    expect(items[0].type).toBe('invitation');
  });

  it('should parse roles from comma-separated string', () => {
    const multiRoleMember = makeMember({ id: 'mem_multi', role: 'admin,employee' });
    const items = buildDisplayItems({ members: [multiRoleMember], pendingInvitations: [] });

    expect(items[0].processedRoles).toEqual(['admin', 'employee']);
  });
});

describe('filterDisplayItems', () => {
  let allItems: DisplayItem[];

  const buildAll = () =>
    buildDisplayItems({
      members: [activeMember, deactivatedMember, inactiveMember],
      pendingInvitations: [pendingInvite],
    });

  beforeEach(() => {
    allItems = buildAll();
  });

  describe('status filter', () => {
    it('should hide deactivated members by default (no status filter)', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: '',
        statusFilter: '',
      });

      expect(result.some((i) => i.displayStatus === 'deactivated')).toBe(false);
      expect(result.some((i) => i.displayStatus === 'active')).toBe(true);
      expect(result.some((i) => i.displayStatus === 'pending')).toBe(true);
    });

    it('should show only active members when status is "active"', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: '',
        statusFilter: 'active',
      });

      expect(result.every((i) => i.displayStatus === 'active')).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should show only deactivated members when status is "deactivated"', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: '',
        statusFilter: 'deactivated',
      });

      expect(result.every((i) => i.displayStatus === 'deactivated')).toBe(true);
      // Both deactivatedMember and inactiveMember should appear
      expect(result).toHaveLength(2);
    });

    it('should show only pending invitations when status is "pending"', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: '',
        statusFilter: 'pending',
      });

      expect(result.every((i) => i.displayStatus === 'pending')).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should show everything when status is "all"', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: '',
        statusFilter: 'all',
      });

      expect(result).toHaveLength(allItems.length);
    });
  });

  describe('search filter', () => {
    it('should filter by name', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: 'User mem_1',
        roleFilter: '',
        statusFilter: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].displayId).toBe('mem_1');
    });

    it('should filter by email', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: 'pending@test.com',
        roleFilter: '',
        statusFilter: 'all',
      });

      expect(result).toHaveLength(1);
      expect(result[0].displayId).toBe('inv_1');
    });

    it('should be case-insensitive', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: 'USER MEM_1',
        roleFilter: '',
        statusFilter: 'all',
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('role filter', () => {
    it('should filter by role', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: 'admin',
        statusFilter: 'all',
      });

      expect(result.every((i) => i.processedRoles.includes('admin'))).toBe(true);
    });

    it('should show all when no role filter set', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: '',
        roleFilter: '',
        statusFilter: 'all',
      });

      expect(result).toHaveLength(allItems.length);
    });
  });

  describe('combined filters', () => {
    it('should apply search and status filters together', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: 'user-mem',
        roleFilter: '',
        statusFilter: 'deactivated',
      });

      // Only deactivated members whose name or email contains "user-mem"
      expect(result.every((i) => i.displayStatus === 'deactivated')).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty when no items match all filters', () => {
      const result = filterDisplayItems({
        items: allItems,
        searchQuery: 'nonexistent',
        roleFilter: 'owner',
        statusFilter: 'pending',
      });

      expect(result).toHaveLength(0);
    });
  });
});

const mockOrgRoleFindMany = jest.fn();
jest.mock('@db', () => ({
  db: {
    organizationRole: {
      findMany: (...a: unknown[]) => mockOrgRoleFindMany(...a),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: { app: ['read'] },
    admin: { app: ['read'] },
    auditor: { app: ['read'] },
    employee: { policy: ['read'], portal: ['read', 'update'] },
    contractor: { policy: ['read'], portal: ['read', 'update'] },
  },
  statement: {
    portal: ['read', 'update'],
  },
}));

import {
  allPermissionsGranted,
  hasAppAccess,
  resolveRolePermissionsWithImplicitPortal,
} from './app-access';

describe('hasAppAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrgRoleFindMany.mockResolvedValue([]);
  });

  it('grants for built-in app roles without a DB lookup', async () => {
    expect(await hasAppAccess('org_1', 'owner')).toBe(true);
    expect(await hasAppAccess('org_1', 'admin')).toBe(true);
    expect(await hasAppAccess('org_1', 'auditor')).toBe(true);
    expect(mockOrgRoleFindMany).not.toHaveBeenCalled();
  });

  it('denies for Portal-only built-in roles', async () => {
    expect(await hasAppAccess('org_1', 'employee')).toBe(false);
    expect(await hasAppAccess('org_1', 'contractor')).toBe(false);
  });

  it('treats comma-separated roles as a union (any granting role wins)', async () => {
    expect(await hasAppAccess('org_1', 'employee,admin')).toBe(true);
  });

  it('grants for a custom role with app:read', async () => {
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ app: ['read'], control: ['read'] }) },
    ]);
    expect(await hasAppAccess('org_1', 'Compliance Lead')).toBe(true);
  });

  it('denies for a custom role without app:read', async () => {
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ policy: ['read'], portal: ['read'] }) },
    ]);
    expect(await hasAppAccess('org_1', 'Portal Role')).toBe(false);
  });

  it('denies for empty or null roles', async () => {
    expect(await hasAppAccess('org_1', null)).toBe(false);
    expect(await hasAppAccess('org_1', '')).toBe(false);
  });

  it('treats a role named like an Object prototype key (constructor) as custom', async () => {
    // Must NOT be shadowed by Object.prototype.constructor — it's a custom role.
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ app: ['read'] }) },
    ]);
    expect(await hasAppAccess('org_1', 'constructor')).toBe(true);
    expect(mockOrgRoleFindMany).toHaveBeenCalled();
  });

  it('does not throw on malformed custom-role permissions', async () => {
    mockOrgRoleFindMany.mockResolvedValue([{ permissions: '{not valid json' }]);
    await expect(hasAppAccess('org_1', 'Broken Role')).resolves.toBe(false);
  });
});

describe('resolveRolePermissionsWithImplicitPortal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOrgRoleFindMany.mockResolvedValue([]);
  });

  it('grants portal:read/update to a custom role that has no stored portal permission', async () => {
    // Reproduces the reported bug: the custom-role editor UI has no toggle
    // for 'portal', so a role like "DevOps Engineer" has none stored.
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ control: ['read'] }) },
    ]);

    const result = await resolveRolePermissionsWithImplicitPortal('org_1', [
      'devops-engineer',
    ]);

    expect(result.control).toEqual(['read']);
    expect(result.portal).toEqual(expect.arrayContaining(['read', 'update']));
  });

  it('does not duplicate portal actions already stored on the custom role', async () => {
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ portal: ['read'] }) },
    ]);

    const result = await resolveRolePermissionsWithImplicitPortal('org_1', [
      'portal-explicit',
    ]);

    expect([...result.portal].sort()).toEqual(['read', 'update']);
  });

  it('does not add portal for built-in roles that intentionally lack it', async () => {
    // 'auditor' has no 'portal' in BUILT_IN_ROLE_PERMISSIONS by design —
    // this fallback must not grant it one just because it's checked here.
    const result = await resolveRolePermissionsWithImplicitPortal('org_1', [
      'auditor',
    ]);

    expect(result.portal).toBeUndefined();
    expect(mockOrgRoleFindMany).not.toHaveBeenCalled();
  });

  it('does not add portal when every role is built-in, even if some grant portal', async () => {
    const result = await resolveRolePermissionsWithImplicitPortal('org_1', [
      'employee',
    ]);

    // employee already has portal from BUILT_IN_ROLE_PERMISSIONS — this just
    // confirms the implicit-grant branch isn't what supplied it.
    expect(result.portal).toEqual(['read', 'update']);
    expect(mockOrgRoleFindMany).not.toHaveBeenCalled();
  });
});

describe('allPermissionsGranted', () => {
  it('returns true when every required resource:action is present', () => {
    expect(
      allPermissionsGranted(
        { portal: ['read', 'update'], control: ['read'] },
        { portal: ['update'] },
      ),
    ).toBe(true);
  });

  it('returns false when a required action is missing', () => {
    expect(
      allPermissionsGranted({ portal: ['read'] }, { portal: ['update'] }),
    ).toBe(false);
  });

  it('returns false when a required resource is absent entirely', () => {
    expect(
      allPermissionsGranted({ control: ['read'] }, { portal: ['read'] }),
    ).toBe(false);
  });
});

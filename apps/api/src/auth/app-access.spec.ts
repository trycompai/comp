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
}));

import { hasAppAccess } from './app-access';

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
});

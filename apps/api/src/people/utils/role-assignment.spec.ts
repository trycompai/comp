import {
  resolveCallerMemberActions,
  validateAssignableRoles,
} from './role-assignment';

jest.mock('@db', () => ({
  db: {
    organizationRole: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    admin: {
      organization: ['read', 'update'],
      member: ['create', 'read', 'update', 'delete'],
      evidence: ['create', 'read', 'update', 'delete'],
      app: ['read'],
      portal: ['read', 'update'],
    },
    auditor: {
      member: ['create', 'read'],
      app: ['read'],
    },
    employee: {
      policy: ['read'],
      portal: ['read', 'update'],
    },
    contractor: {
      policy: ['read'],
      portal: ['read', 'update'],
    },
  },
  isRestrictedRole: (role: string) =>
    role === 'employee' || role === 'contractor',
  parseRolePermissions: (value: unknown) => {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  },
}));

import { db } from '@db';

const mockFindMany = db.organizationRole.findMany as jest.Mock;

const ORG = 'org_1';

const PARTIAL_MEMBER_ACTIONS = new Set(['create', 'read']);
const FULL_MEMBER_ACTIONS = new Set(['create', 'read', 'update', 'delete']);

describe('validateAssignableRoles — custom-role superset rule (GH-037)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a limited caller assigning a custom admin-level role', async () => {
    mockFindMany.mockResolvedValue([
      {
        name: 'superuser',
        permissions: JSON.stringify({
          member: ['create', 'read', 'update', 'delete'],
        }),
      },
    ]);

    const error = await validateAssignableRoles(
      ['superuser'],
      PARTIAL_MEMBER_ACTIONS,
      {
        organizationId: ORG,
        callerRole: 'auditor',
      },
    );

    expect(error).toContain('superuser');
    expect(error).toContain('permissions you do not hold');
  });

  it('allows an admin to assign a custom auditor-level role', async () => {
    mockFindMany.mockResolvedValue([
      {
        name: 'read-only-reviewer',
        permissions: JSON.stringify({
          member: ['read'],
          evidence: ['read'],
        }),
      },
    ]);

    const error = await validateAssignableRoles(
      ['read-only-reviewer'],
      PARTIAL_MEMBER_ACTIONS,
      {
        organizationId: ORG,
        callerRole: 'admin',
      },
    );

    expect(error).toBeNull();
  });

  it('rejects a scoped API key assigning a custom role with permissions beyond its scopes', async () => {
    mockFindMany.mockResolvedValue([
      {
        name: 'member-manager',
        permissions: JSON.stringify({
          member: ['create', 'read', 'update'],
        }),
      },
    ]);

    const error = await validateAssignableRoles(
      ['member-manager'],
      new Set(['create']),
      {
        organizationId: ORG,
        isApiKey: true,
        apiKeyScopes: ['member:create'],
      },
    );

    expect(error).toContain('member-manager');
  });

  it('allows a scoped API key to assign a custom role covered by its scopes', async () => {
    mockFindMany.mockResolvedValue([
      {
        name: 'member-creator',
        permissions: JSON.stringify({ member: ['create'] }),
      },
    ]);

    const error = await validateAssignableRoles(
      ['member-creator'],
      new Set(['create']),
      {
        organizationId: ORG,
        isApiKey: true,
        apiKeyScopes: ['member:create'],
      },
    );

    expect(error).toBeNull();
  });

  it('skips the custom-role lookup entirely for full member write access', async () => {
    const error = await validateAssignableRoles(
      ['anything-goes'],
      FULL_MEMBER_ACTIONS,
      {
        organizationId: ORG,
        callerRole: 'admin',
      },
    );

    expect(error).toBeNull();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('fail-closed: rejects a custom role name that resolves to no row in this org', async () => {
    mockFindMany.mockResolvedValue([]);

    const error = await validateAssignableRoles(
      ['typo-role'],
      PARTIAL_MEMBER_ACTIONS,
      {
        organizationId: ORG,
        callerRole: 'auditor',
      },
    );

    expect(error).toContain('typo-role');
    expect(error).toContain('unknown or out-of-organization');
  });

  it('requires a context: the parameter type excludes undefined (fail-closed by signature)', () => {
    type ThirdParam = Parameters<typeof validateAssignableRoles>[2];
    const contextIsRequired: undefined extends ThirdParam ? never : true = true;
    expect(contextIsRequired).toBe(true);
  });

  it('still rejects built-in privileged roles for limited callers', async () => {
    const error = await validateAssignableRoles(
      ['admin'],
      PARTIAL_MEMBER_ACTIONS,
      {
        organizationId: ORG,
        callerRole: 'auditor',
      },
    );

    expect(error).toContain('privileged roles');
    expect(error).toContain('admin');
  });
});

describe('resolveCallerMemberActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grants full member actions to legacy API keys (empty scopes)', async () => {
    const actions = await resolveCallerMemberActions({
      callerRole: '',
      organizationId: ORG,
      isApiKey: true,
      apiKeyScopes: [],
    });

    expect(actions).toEqual(new Set(['create', 'read', 'update', 'delete']));
  });

  it('derives member actions from scoped API keys', async () => {
    const actions = await resolveCallerMemberActions({
      callerRole: '',
      organizationId: ORG,
      isApiKey: true,
      apiKeyScopes: ['member:create', 'task:read'],
    });

    expect(actions).toEqual(new Set(['create']));
  });

  it('unions built-in and custom role member actions for sessions', async () => {
    mockFindMany.mockResolvedValue([
      {
        permissions: JSON.stringify({ member: ['update'] }),
      },
    ]);

    const actions = await resolveCallerMemberActions({
      callerRole: 'auditor,delegated-admin',
      organizationId: ORG,
    });

    expect(actions).toEqual(new Set(['create', 'read', 'update']));
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG,
          name: { in: ['delegated-admin'] },
        },
      }),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { ApiKeyService } from './api-key.service';
import { SKIP_ORG_CHECK_KEY } from './skip-org-check.decorator';

// Mock auth.server — only the two session resolvers the guard uses.
const mockGetSession = jest.fn();
const mockGetMcpSession = jest.fn();
jest.mock('./auth.server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getMcpSession: (...args: unknown[]) => mockGetMcpSession(...args),
    },
  },
}));

// Mock @db — the guard resolves the user, then enumerates active memberships
// (device-agent style) to bind the organization for the MCP OAuth path.
const mockUserFindUnique = jest.fn();
const mockMemberFindMany = jest.fn();
const mockMemberFindFirst = jest.fn();
const mockOrgFindUnique = jest.fn();
const mockMcpBindingFindUnique = jest.fn();
const mockOrgRoleFindMany = jest.fn();
jest.mock('@db', () => ({
  db: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    member: {
      findMany: (...args: unknown[]) => mockMemberFindMany(...args),
      findFirst: (...args: unknown[]) => mockMemberFindFirst(...args),
    },
    organization: {
      findUnique: (...args: unknown[]) => mockOrgFindUnique(...args),
    },
    mcpOrgBinding: {
      findUnique: (...args: unknown[]) => mockMcpBindingFindUnique(...args),
    },
    organizationRole: {
      findMany: (...args: unknown[]) => mockOrgRoleFindMany(...args),
    },
  },
}));

// Service-token validation is a pure lookup; mock it so tests can present a
// valid token and reach the x-user-id acting-member resolution.
const mockResolveServiceByToken = jest.fn();
jest.mock('./service-token.config', () => ({
  resolveServiceByToken: (...args: unknown[]) =>
    mockResolveServiceByToken(...args),
}));

// Mock @trycompai/auth — the app-access gate reads BUILT_IN_ROLE_PERMISSIONS to
// decide which roles grant app access. owner/admin/auditor do; employee does not.
jest.mock('@trycompai/auth', () => ({
  BUILT_IN_ROLE_PERMISSIONS: {
    owner: { app: ['read'] },
    admin: { app: ['read'] },
    auditor: { app: ['read'] },
    employee: { policy: ['read'], portal: ['read', 'update'] },
    contractor: { policy: ['read'], portal: ['read', 'update'] },
  },
}));

describe('HybridAuthGuard — MCP OAuth path', () => {
  let guard: HybridAuthGuard;
  let reflector: Reflector;

  // A real object so the guard's mutations (userId, userRoles, …) are observable.
  const createContext = (
    headers: Record<string, string>,
  ): { context: ExecutionContext; request: Record<string, unknown> } => {
    const request: Record<string, unknown> = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridAuthGuard,
        {
          provide: ApiKeyService,
          useValue: { extractApiKey: jest.fn(), validateApiKey: jest.fn() },
        },
        Reflector,
      ],
    }).compile();

    guard = module.get<HybridAuthGuard>(HybridAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    // Not public, and don't skip the org check.
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    // No cookie/regular session → forces the MCP OAuth fallback.
    mockGetSession.mockResolvedValue(null);
    // No org binding by default; individual tests override.
    mockMcpBindingFindUnique.mockResolvedValue(null);
    // No custom roles by default (built-in roles resolve without a DB call).
    mockOrgRoleFindMany.mockResolvedValue([]);
  });

  it('authenticates a single-org user (admin) and binds org + roles', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_1', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_1',
      email: 'admin@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_1', role: 'owner,admin', department: 'it', organizationId: 'org_1' },
    ]);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.userId).toBe('usr_1');
    expect(request.organizationId).toBe('org_1');
    expect(request.userRoles).toEqual(['owner', 'admin']);
    expect(request.authType).toBe('session');
    expect(request.isApiKey).toBe(false);
    expect(request.memberId).toBe('mem_1');
  });

  it('authenticates a read-only member and surfaces their role for RBAC', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_2', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_2',
      email: 'auditor@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_2', role: 'auditor', department: 'none', organizationId: 'org_1' },
    ]);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.userRoles).toEqual(['auditor']);
    expect(request.organizationId).toBe('org_1');
  });

  it('rejects when the bearer token is not a valid MCP OAuth token', async () => {
    mockGetMcpSession.mockResolvedValue(null);

    const { context } = createContext({
      authorization: 'Bearer not_a_token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a valid token whose user has no organization', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_3', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_3',
      email: 'orphan@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([]);

    const { context } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    // 403 (authenticated, but no org) — not a 401 that would trigger re-auth.
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('blocks an org-less user even on org-agnostic (skipOrgCheck) endpoints', async () => {
    // skipOrgCheck = true for this request, but the user belongs to no org —
    // a "foreign" user must not be able to use the MCP at all.
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) => key === SKIP_ORG_CHECK_KEY);
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_x', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_x',
      email: 'stranger@example.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([]); // member of nothing

    const { context } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('multi-org with no saved choice → asks them to pick (no silent tenant)', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_5', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_5',
      email: 'consultant@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_a', role: 'admin', department: 'none', organizationId: 'org_a' },
      { id: 'mem_b', role: 'owner', department: 'none', organizationId: 'org_b' },
    ]);
    mockMcpBindingFindUnique.mockResolvedValue(null);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    // 403 (token is valid — user just needs to pick an org), not a 401.
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    // No tenant must have been bound.
    expect(request.organizationId).toBe('');
  });

  it('multi-org with a saved choice → binds the chosen org', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_6', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_6',
      email: 'consultant@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_a', role: 'admin', department: 'none', organizationId: 'org_a' },
      { id: 'mem_b', role: 'owner', department: 'it', organizationId: 'org_b' },
    ]);
    mockMcpBindingFindUnique.mockResolvedValue({ organizationId: 'org_b' });

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.organizationId).toBe('org_b');
    expect(request.memberId).toBe('mem_b');
    expect(request.userRoles).toEqual(['owner']);
  });

  it('multi-org with a stale choice (no longer a member) → asks them to pick', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_7', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_7',
      email: 'consultant@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_a', role: 'admin', department: 'none', organizationId: 'org_a' },
      { id: 'mem_b', role: 'owner', department: 'none', organizationId: 'org_b' },
    ]);
    // Bound to an org they were removed from.
    mockMcpBindingFindUnique.mockResolvedValue({ organizationId: 'org_gone' });

    const { context } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    // 403 (token is valid — user just needs to pick an org), not a 401.
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('marks platform admins from the user role', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_4', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_4',
      email: 'staff@trycomp.ai',
      role: 'admin',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_4', role: 'owner', department: 'none', organizationId: 'org_1' },
    ]);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.isPlatformAdmin).toBe(true);
  });

  it('lets a platform admin through even with a non-app-access member role', async () => {
    // Platform admin (user.role='admin') who is only an employee in the org —
    // should bypass the app-access gate, consistent with PermissionGuard.
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_pa', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_pa',
      email: 'staff@trycomp.ai',
      role: 'admin',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_pa', role: 'employee', department: 'none', organizationId: 'org_1' },
    ]);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.organizationId).toBe('org_1');
    expect(request.isPlatformAdmin).toBe(true);
  });

  it('blocks a Portal-only role (employee) — no app access, no MCP', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_e', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_e',
      email: 'employee@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_e', role: 'employee', department: 'none', organizationId: 'org_1' },
    ]);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(request.organizationId).toBe('');
  });

  it('allows a custom role that grants app access', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_c', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_c',
      email: 'custom@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_c', role: 'Compliance Lead', department: 'none', organizationId: 'org_1' },
    ]);
    // Custom role resolved from organization_role with app access granted.
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ app: ['read'], control: ['read'] }) },
    ]);

    const { context, request } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.organizationId).toBe('org_1');
    expect(request.userRoles).toEqual(['Compliance Lead']);
  });

  it('blocks a custom role that lacks app access', async () => {
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_d', scopes: 'openid' });
    mockUserFindUnique.mockResolvedValue({
      id: 'usr_d',
      email: 'limited@acme.com',
      role: 'user',
    });
    mockMemberFindMany.mockResolvedValue([
      { id: 'mem_d', role: 'Read Only Portal', department: 'none', organizationId: 'org_1' },
    ]);
    mockOrgRoleFindMany.mockResolvedValue([
      { permissions: JSON.stringify({ policy: ['read'], portal: ['read'] }) },
    ]);

    const { context } = createContext({
      authorization: 'Bearer mcp_access_token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});

describe('HybridAuthGuard — service token x-user-id acting member', () => {
  let guard: HybridAuthGuard;
  let reflector: Reflector;

  const createContext = (
    headers: Record<string, string>,
  ): { context: ExecutionContext; request: Record<string, unknown> } => {
    const request: Record<string, unknown> = { headers };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  const svcHeaders = (userId?: string): Record<string, string> => ({
    'x-service-token': 'valid_service_token',
    'x-organization-id': 'org_1',
    ...(userId ? { 'x-user-id': userId } : {}),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridAuthGuard,
        {
          provide: ApiKeyService,
          useValue: { extractApiKey: jest.fn(), validateApiKey: jest.fn() },
        },
        Reflector,
      ],
    }).compile();
    guard = module.get<HybridAuthGuard>(HybridAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    // Valid service token + existing org so we reach the x-user-id block.
    mockResolveServiceByToken.mockReturnValue({
      definition: { name: 'Trigger.dev' },
    });
    mockOrgFindUnique.mockResolvedValue({ id: 'org_1' });
    mockMemberFindFirst.mockResolvedValue(null);
  });

  it('attributes an ACTIVE member: sets request.userId + memberId, scoped to active memberships', async () => {
    mockMemberFindFirst.mockResolvedValue({
      id: 'mem_active',
      userId: 'usr_active',
    });

    const { context, request } = createContext(svcHeaders('usr_active'));
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.userId).toBe('usr_active');
    expect(request.memberId).toBe('mem_active');
    // The lookup must exclude deactivated/inactive memberships.
    expect(mockMemberFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'usr_active',
          organizationId: 'org_1',
          deactivated: false,
          isActive: true,
        }),
      }),
    );
  });

  it('does NOT attribute a deactivated/inactive member (no userId/memberId set)', async () => {
    // The active-only filter yields no row for an offboarded member.
    mockMemberFindFirst.mockResolvedValue(null);

    const { context, request } = createContext(svcHeaders('usr_offboarded'));
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.userId).toBeUndefined();
    expect(request.memberId).toBeUndefined();
    // Auth still succeeds as a service token, just with no acting user.
    expect(request.isServiceToken).toBe(true);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { ApiKeyService } from './api-key.service';

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
const mockMcpBindingFindUnique = jest.fn();
jest.mock('@db', () => ({
  db: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    member: { findMany: (...args: unknown[]) => mockMemberFindMany(...args) },
    mcpOrgBinding: {
      findUnique: (...args: unknown[]) => mockMcpBindingFindUnique(...args),
    },
  },
}));

// Avoid ESM issues from the api-key.service import chain (it imports @trycompai/auth).
jest.mock('@trycompai/auth', () => ({}));

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
});

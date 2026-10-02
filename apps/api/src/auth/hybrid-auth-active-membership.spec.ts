import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Test } from '@nestjs/testing';
import { z } from 'zod';

const mockGetSession = jest.fn();
const mockGetMcpSession = jest.fn();
const mockMemberFindFirst = jest.fn();
const mockMemberFindMany = jest.fn();
const mockExtractApiKey = jest.fn();
const mockValidateApiKey = jest.fn();

jest.mock('./auth.server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      getMcpSession: (...args: unknown[]) => mockGetMcpSession(...args),
    },
  },
}));
jest.mock('./api-key.service', () => ({ ApiKeyService: class {} }));
jest.mock('./app-access', () => ({
  hasAppAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('./service-token.config', () => ({
  resolveServiceByToken: jest
    .fn()
    .mockReturnValue({ definition: { name: 'Trigger.dev' } }),
}));
jest.mock('@db', () => ({
  db: {
    member: {
      findFirst: (...args: unknown[]) => mockMemberFindFirst(...args),
      findMany: (...args: unknown[]) => mockMemberFindMany(...args),
    },
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'usr_1', email: 'user@example.com' }),
    },
    organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org_1' }) },
    mcpOrgBinding: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}));

import { HybridAuthGuard } from './hybrid-auth.guard';
import { ApiKeyService } from './api-key.service';

interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  isActive: boolean;
  deactivated: boolean;
}

const querySchema = z.object({
  where: z.object({
    userId: z.string(),
    organizationId: z.string().optional(),
    isActive: z.boolean().optional(),
    deactivated: z.boolean().optional(),
  }),
});

function matchingMembers({
  query,
  members,
}: {
  query: unknown;
  members: Membership[];
}) {
  const { where } = querySchema.parse(query);
  return members.filter(
    (member) =>
      member.userId === where.userId &&
      (!where.organizationId ||
        member.organizationId === where.organizationId) &&
      (where.isActive === undefined || member.isActive === where.isActive) &&
      (where.deactivated === undefined ||
        member.deactivated === where.deactivated),
  );
}

function createContext(
  headers: Record<string, string> = { cookie: 'session=valid' },
) {
  const request: Record<string, unknown> = { headers };
  return { request, context: new ExecutionContextHost([request]) };
}

describe('HybridAuthGuard active membership enforcement', () => {
  let guard: HybridAuthGuard;
  let members: Membership[];

  beforeEach(async () => {
    jest.clearAllMocks();
    members = [
      {
        id: 'mem_1',
        userId: 'usr_1',
        organizationId: 'org_1',
        role: 'admin',
        isActive: true,
        deactivated: false,
      },
    ];
    mockMemberFindFirst.mockImplementation((query: unknown) =>
      Promise.resolve(matchingMembers({ query, members })[0] ?? null),
    );
    mockMemberFindMany.mockImplementation((query: unknown) =>
      Promise.resolve(matchingMembers({ query, members })),
    );
    mockGetSession.mockResolvedValue({
      user: { id: 'usr_1', email: 'user@example.com' },
      session: { id: 'session_1', activeOrganizationId: 'org_1' },
    });
    mockGetMcpSession.mockResolvedValue({ userId: 'usr_1' });
    const module = await Test.createTestingModule({
      providers: [
        HybridAuthGuard,
        {
          provide: ApiKeyService,
          useValue: {
            extractApiKey: mockExtractApiKey,
            validateApiKey: mockValidateApiKey,
          },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn().mockReturnValue(false) },
        },
      ],
    }).compile();
    guard = module.get(HybridAuthGuard);
  });

  it('allows a session with active membership', async () => {
    const { context, request } = createContext();
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.memberId).toBe('mem_1');
  });

  it.each([
    { isActive: false, deactivated: false },
    { isActive: true, deactivated: true },
  ])('rejects revoked session membership: %j', async (override) => {
    members = members.map((member) => ({ ...member, ...override }));
    const { context, request } = createContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(request.memberId).toBeUndefined();
  });

  it('rejects MCP OAuth when its sole membership is inactive', async () => {
    mockGetSession.mockResolvedValue(null);
    members = members.map((member) => ({ ...member, isActive: false }));
    const { context } = createContext({ authorization: 'Bearer mcp-token' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('ignores inactive MCP memberships when selecting the sole active tenant', async () => {
    mockGetSession.mockResolvedValue(null);
    members.push({
      id: 'mem_old',
      userId: 'usr_1',
      organizationId: 'org_old',
      role: 'admin',
      isActive: false,
      deactivated: false,
    });
    const { context, request } = createContext({
      authorization: 'Bearer mcp-token',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.organizationId).toBe('org_1');
  });

  it('preserves organization-scoped API-key authentication', async () => {
    mockExtractApiKey.mockReturnValue('key');
    mockValidateApiKey.mockResolvedValue({
      organizationId: 'org_1',
      scopes: ['integration:read'],
    });
    const { context, request } = createContext({ 'x-api-key': 'key' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.authType).toBe('api-key');
    expect(mockMemberFindFirst).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });

  it('preserves service-token authentication without an acting user', async () => {
    const { context, request } = createContext({
      'x-service-token': 'token',
      'x-organization-id': 'org_1',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.authType).toBe('service');
    expect(mockMemberFindFirst).not.toHaveBeenCalled();
    expect(mockGetSession).not.toHaveBeenCalled();
  });
});

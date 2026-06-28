jest.mock('@db', () => ({
  db: {
    member: {
      findFirst: jest.fn(),
    },
  },
}));

import {
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { db } from '@db';
import type { Request } from 'express';
import type { AuthContext as AuthContextType } from '../auth/types';
import { resolveAssistantChatContext } from './assistant-chat-context';

const mockedDb = db as unknown as { member: { findFirst: jest.Mock } };

function makeAuth(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    organizationId: 'org_active',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_1',
    userRoles: ['admin'],
    ...overrides,
  };
}

function makeReq(orgHeader?: string): Request {
  return {
    headers: orgHeader ? { 'x-organization-id': orgHeader } : {},
  } as unknown as Request;
}

describe('resolveAssistantChatContext', () => {
  const logger = { log: jest.fn() } as unknown as Logger;
  const rolesService = { resolvePermissions: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    rolesService.resolvePermissions.mockResolvedValue({ app: ['read'] });
  });

  it('uses the session active org when no org header is sent', async () => {
    const result = await resolveAssistantChatContext({
      auth: makeAuth(),
      req: makeReq(),
      rolesService,
      logger,
    });

    expect(result.organizationId).toBe('org_active');
    expect(result.userId).toBe('usr_1');
    expect(mockedDb.member.findFirst).not.toHaveBeenCalled();
    expect(rolesService.resolvePermissions).toHaveBeenCalledWith('org_active', [
      'admin',
    ]);
  });

  it('uses the session active org when the header matches it (no membership re-check)', async () => {
    const result = await resolveAssistantChatContext({
      auth: makeAuth(),
      req: makeReq('org_active'),
      rolesService,
      logger,
    });

    expect(result.organizationId).toBe('org_active');
    expect(mockedDb.member.findFirst).not.toHaveBeenCalled();
  });

  it('scopes to a different requested org after verifying active membership + app access', async () => {
    mockedDb.member.findFirst.mockResolvedValue({ role: 'admin' });

    const result = await resolveAssistantChatContext({
      auth: makeAuth(),
      req: makeReq('org_other'),
      rolesService,
      logger,
    });

    expect(mockedDb.member.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'usr_1',
        organizationId: 'org_other',
        deactivated: false,
      },
      select: { role: true },
    });
    expect(rolesService.resolvePermissions).toHaveBeenCalledWith('org_other', [
      'admin',
    ]);
    expect(result.organizationId).toBe('org_other');
  });

  it('rejects a requested org the user is not a member of', async () => {
    mockedDb.member.findFirst.mockResolvedValue(null);

    await expect(
      resolveAssistantChatContext({
        auth: makeAuth(),
        req: makeReq('org_not_mine'),
        rolesService,
        logger,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a requested org where the member lacks app access', async () => {
    mockedDb.member.findFirst.mockResolvedValue({ role: 'employee' });
    rolesService.resolvePermissions.mockResolvedValue({ policy: ['read'] });

    await expect(
      resolveAssistantChatContext({
        auth: makeAuth(),
        req: makeReq('org_other'),
        rolesService,
        logger,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a user id', async () => {
    await expect(
      resolveAssistantChatContext({
        auth: makeAuth({ userId: undefined }),
        req: makeReq(),
        rolesService,
        logger,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an organization when neither header nor active org is present', async () => {
    await expect(
      resolveAssistantChatContext({
        auth: makeAuth({ organizationId: '' }),
        req: makeReq(),
        rolesService,
        logger,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ignores a blank org header and falls back to the active org', async () => {
    const result = await resolveAssistantChatContext({
      auth: makeAuth(),
      req: makeReq('   '),
      rolesService,
      logger,
    });

    expect(result.organizationId).toBe('org_active');
    expect(mockedDb.member.findFirst).not.toHaveBeenCalled();
  });
});

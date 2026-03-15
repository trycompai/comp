jest.mock('@trycompai/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('./auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import {
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { auth } from './auth.server';
import { PlatformAdminGuard } from './platform-admin.guard';

const mockDb = db as jest.Mocked<typeof db>;
const mockAuth = auth as jest.Mocked<typeof auth>;

function createMockContext(headers: Record<string, string>): ExecutionContext {
  const request = {
    headers,
    userId: undefined as string | undefined,
    userEmail: undefined as string | undefined,
    isPlatformAdmin: undefined as boolean | undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: jest.fn(), getData: jest.fn() }),
    switchToWs: () => ({
      getClient: jest.fn(),
      getData: jest.fn(),
      getPattern: jest.fn(),
    }),
    getType: () => 'http' as const,
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PlatformAdminGuard();
  });

  describe('session-based auth', () => {
    it('should allow platform admin via Bearer session token', async () => {
      const context = createMockContext({
        authorization: 'Bearer session-token-abc',
      });

      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: { id: 'usr_1' },
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'admin@test.com',
        isPlatformAdmin: true,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.userId).toBe('usr_1');
      expect(request.userEmail).toBe('admin@test.com');
      expect(request.isPlatformAdmin).toBe(true);
    });

    it('should allow platform admin via cookie session', async () => {
      const context = createMockContext({
        cookie: 'better-auth.session_token=abc123',
      });

      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: { id: 'usr_1' },
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'admin@test.com',
        isPlatformAdmin: true,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should pass authorization header to better-auth', async () => {
      const context = createMockContext({
        authorization: 'Bearer my-token',
      });

      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: { id: 'usr_1' },
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'admin@test.com',
        isPlatformAdmin: true,
      });

      await guard.canActivate(context);

      const callArg = (mockAuth.api.getSession as jest.Mock).mock.calls[0][0];
      expect(callArg.headers.get('authorization')).toBe('Bearer my-token');
    });

    it('should throw UnauthorizedException when no auth headers', async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session is invalid', async () => {
      const context = createMockContext({
        authorization: 'Bearer invalid-token',
      });
      (mockAuth.api.getSession as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session has no user', async () => {
      const context = createMockContext({
        cookie: 'session=abc',
      });
      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: null,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found in DB', async () => {
      const context = createMockContext({
        cookie: 'session=abc',
      });
      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: { id: 'usr_gone' },
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user is not platform admin', async () => {
      const context = createMockContext({
        cookie: 'session=abc',
      });
      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: { id: 'usr_1' },
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'regular@test.com',
        isPlatformAdmin: false,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should check isPlatformAdmin on the DB user, not session', async () => {
      const context = createMockContext({
        authorization: 'Bearer token',
      });
      (mockAuth.api.getSession as jest.Mock).mockResolvedValue({
        user: { id: 'usr_1' },
      });
      (mockDb.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'usr_1',
        email: 'user@test.com',
        isPlatformAdmin: false,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockDb.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'usr_1' },
        select: { id: true, email: true, isPlatformAdmin: true },
      });
    });
  });
});

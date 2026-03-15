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
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    guard = new PlatformAdminGuard();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Bearer token auth (INTERNAL_API_SECRET)', () => {
    it('should allow access with valid INTERNAL_API_SECRET', async () => {
      process.env.INTERNAL_API_SECRET = 'super-secret-token';
      const context = createMockContext({
        authorization: 'Bearer super-secret-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.userId).toBe('system-admin');
      expect(request.userEmail).toBe('admin@internal');
      expect(request.isPlatformAdmin).toBe(true);
    });

    it('should not call DB or auth when secret matches', async () => {
      process.env.INTERNAL_API_SECRET = 'valid-secret';
      const context = createMockContext({
        authorization: 'Bearer valid-secret',
      });

      await guard.canActivate(context);

      expect(mockDb.user.findUnique).not.toHaveBeenCalled();
      expect(mockAuth.api.getSession).not.toHaveBeenCalled();
    });

    it('should fall through to session auth when secret does not match', async () => {
      process.env.INTERNAL_API_SECRET = 'correct-secret';
      const context = createMockContext({
        authorization: 'Bearer wrong-secret',
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
      expect(mockAuth.api.getSession).toHaveBeenCalled();
    });

    it('should fall through when INTERNAL_API_SECRET env var is not set', async () => {
      delete process.env.INTERNAL_API_SECRET;
      const context = createMockContext({
        authorization: 'Bearer some-token',
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
      expect(mockAuth.api.getSession).toHaveBeenCalled();
    });

    it('should reject tokens of different lengths (timing-safe)', async () => {
      process.env.INTERNAL_API_SECRET = 'short';
      const context = createMockContext({
        authorization: 'Bearer much-longer-different-token',
      });

      (mockAuth.api.getSession as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Session-based auth', () => {
    it('should allow platform admin via session', async () => {
      const context = createMockContext({
        cookie: 'session=abc123',
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

    it('should throw UnauthorizedException when no auth headers', async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session is invalid', async () => {
      const context = createMockContext({
        cookie: 'session=invalid',
      });
      (mockAuth.api.getSession as jest.Mock).mockResolvedValue(null);

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
  });
});

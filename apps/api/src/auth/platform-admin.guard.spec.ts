import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

const mockGetSession = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('./auth.server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

jest.mock('@db', () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

function buildContext(headers: Record<string, string | undefined> = {}): ExecutionContext {
  const request = { headers, userId: undefined, userEmail: undefined, isPlatformAdmin: undefined };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    guard = new PlatformAdminGuard();
    jest.clearAllMocks();
  });

  it('throws UnauthorizedException when no auth headers are present', async () => {
    const ctx = buildContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Platform admin routes require authentication',
    );
  });

  it('throws UnauthorizedException when session is invalid', async () => {
    mockGetSession.mockResolvedValue(null);
    const ctx = buildContext({ authorization: 'Bearer bad_token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Invalid or expired session',
    );
  });

  it('throws UnauthorizedException when session has no user id', async () => {
    mockGetSession.mockResolvedValue({ user: { id: null } });
    const ctx = buildContext({ cookie: 'session=abc' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when user is not found in DB', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'usr_1' } });
    mockFindUnique.mockResolvedValue(null);
    const ctx = buildContext({ cookie: 'session=abc' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('User not found');
  });

  it('throws ForbiddenException when user role is not admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'usr_1' } });
    mockFindUnique.mockResolvedValue({
      id: 'usr_1',
      email: 'user@test.com',
      role: 'user',
    });
    const ctx = buildContext({ cookie: 'session=abc' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      'Access denied: Platform admin privileges required',
    );
  });

  it('throws ForbiddenException when user role is null', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'usr_1' } });
    mockFindUnique.mockResolvedValue({
      id: 'usr_1',
      email: 'user@test.com',
      role: null,
    });
    const ctx = buildContext({ cookie: 'session=abc' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('returns true and sets request context for valid admin', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'usr_admin' } });
    mockFindUnique.mockResolvedValue({
      id: 'usr_admin',
      email: 'admin@platform.com',
      role: 'admin',
    });

    const request = {
      headers: { authorization: 'Bearer valid_token' },
      userId: undefined as string | undefined,
      userEmail: undefined as string | undefined,
      isPlatformAdmin: undefined as boolean | undefined,
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.userId).toBe('usr_admin');
    expect(request.userEmail).toBe('admin@platform.com');
    expect(request.isPlatformAdmin).toBe(true);
  });

  it('always queries the DB even if session contains role info', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'usr_1', role: 'admin' },
    });
    mockFindUnique.mockResolvedValue({
      id: 'usr_1',
      email: 'user@test.com',
      role: 'user',
    });
    const ctx = buildContext({ cookie: 'session=abc' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'usr_1' },
      select: { id: true, email: true, role: true },
    });
  });

  it('does not allow API key authentication', async () => {
    const ctx = buildContext({ 'x-api-key': 'some_key' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('does not allow service token authentication', async () => {
    const ctx = buildContext({ 'x-service-token': 'some_token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('forwards authorization header to better-auth', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'usr_admin' } });
    mockFindUnique.mockResolvedValue({
      id: 'usr_admin',
      email: 'admin@test.com',
      role: 'admin',
    });
    const ctx = buildContext({ authorization: 'Bearer token123' });

    await guard.canActivate(ctx);

    const passedHeaders = mockGetSession.mock.calls[0][0].headers;
    expect(passedHeaders.get('authorization')).toBe('Bearer token123');
  });

  it('forwards cookie header to better-auth', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'usr_admin' } });
    mockFindUnique.mockResolvedValue({
      id: 'usr_admin',
      email: 'admin@test.com',
      role: 'admin',
    });
    const ctx = buildContext({ cookie: 'session=xyz' });

    await guard.canActivate(ctx);

    const passedHeaders = mockGetSession.mock.calls[0][0].headers;
    expect(passedHeaders.get('cookie')).toBe('session=xyz');
  });
});

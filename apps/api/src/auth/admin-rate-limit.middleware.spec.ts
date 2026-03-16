import type { Request, Response } from 'express';

let adminAuthRateLimiter: typeof import('./admin-rate-limit.middleware').adminAuthRateLimiter;

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();

  adminAuthRateLimiter =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('./admin-rate-limit.middleware').adminAuthRateLimiter;
});

afterEach(() => {
  jest.useRealTimers();
});

function buildReq(path: string, ip = '127.0.0.1'): Request {
  return { path, ip, socket: { remoteAddress: ip } } as unknown as Request;
}

function buildRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('adminAuthRateLimiter', () => {
  it('passes through requests that are not admin auth routes', () => {
    const next = jest.fn();
    adminAuthRateLimiter(buildReq('/api/auth/sign-in'), buildRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('passes through non-auth requests', () => {
    const next = jest.fn();
    adminAuthRateLimiter(buildReq('/v1/policies'), buildRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows admin auth requests within the rate limit', () => {
    const next = jest.fn();
    for (let i = 0; i < 10; i++) {
      adminAuthRateLimiter(
        buildReq('/api/auth/admin/impersonate-user'),
        buildRes(),
        next,
      );
    }
    expect(next).toHaveBeenCalledTimes(10);
  });

  it('rejects the 11th request within the window', () => {
    const next = jest.fn();
    for (let i = 0; i < 10; i++) {
      adminAuthRateLimiter(
        buildReq('/api/auth/admin/set-role'),
        buildRes(),
        next,
      );
    }
    expect(next).toHaveBeenCalledTimes(10);

    const res = buildRes();
    adminAuthRateLimiter(buildReq('/api/auth/admin/set-role'), res, next);
    expect(next).toHaveBeenCalledTimes(10);
    expect(res.statusCode).toBe(429);
  });

  it('resets the window after 60 seconds', () => {
    const next = jest.fn();
    for (let i = 0; i < 10; i++) {
      adminAuthRateLimiter(
        buildReq('/api/auth/admin/ban-user'),
        buildRes(),
        next,
      );
    }
    expect(next).toHaveBeenCalledTimes(10);

    jest.advanceTimersByTime(61_000);

    adminAuthRateLimiter(
      buildReq('/api/auth/admin/ban-user'),
      buildRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(11);
  });

  it('tracks different IPs independently', () => {
    const next = jest.fn();
    for (let i = 0; i < 10; i++) {
      adminAuthRateLimiter(
        buildReq('/api/auth/admin/set-role', '10.0.0.1'),
        buildRes(),
        next,
      );
    }

    const res = buildRes();
    adminAuthRateLimiter(
      buildReq('/api/auth/admin/set-role', '10.0.0.1'),
      res,
      next,
    );
    expect(res.statusCode).toBe(429);

    adminAuthRateLimiter(
      buildReq('/api/auth/admin/set-role', '10.0.0.2'),
      buildRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(11);
  });
});

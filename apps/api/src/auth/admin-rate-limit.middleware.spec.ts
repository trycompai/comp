import type { Request, Response } from 'express';

const mockLimit = jest.fn();

const MockRatelimit = jest.fn().mockImplementation(() => ({
  limit: mockLimit,
}));
(MockRatelimit as unknown as Record<string, unknown>).slidingWindow = jest
  .fn()
  .mockReturnValue('sliding-window-config');

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
}));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

// Set env vars before importing the middleware
process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

import { adminAuthRateLimiter } from './admin-rate-limit.middleware';

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
  beforeEach(() => {
    mockLimit.mockReset();
    mockLimit.mockResolvedValue({ success: true });
  });

  it('passes through requests that are not admin auth routes', async () => {
    const next = jest.fn();
    await adminAuthRateLimiter(buildReq('/api/auth/sign-in'), buildRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('passes through non-auth requests', async () => {
    const next = jest.fn();
    await adminAuthRateLimiter(buildReq('/v1/policies'), buildRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('allows admin auth requests when rate limit succeeds', async () => {
    const next = jest.fn();
    await adminAuthRateLimiter(
      buildReq('/api/auth/admin/impersonate-user'),
      buildRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLimit).toHaveBeenCalledWith('127.0.0.1');
  });

  it('rejects requests when rate limit is exceeded', async () => {
    mockLimit.mockResolvedValue({ success: false });

    const next = jest.fn();
    const res = buildRes();
    await adminAuthRateLimiter(buildReq('/api/auth/admin/set-role'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({
      error: 'Too many requests to admin endpoints. Try again later.',
    });
  });

  it('uses IP from request for rate limit key', async () => {
    const next = jest.fn();
    await adminAuthRateLimiter(
      buildReq('/api/auth/admin/set-role', '10.0.0.1'),
      buildRes(),
      next,
    );
    expect(mockLimit).toHaveBeenCalledWith('10.0.0.1');

    await adminAuthRateLimiter(
      buildReq('/api/auth/admin/set-role', '10.0.0.2'),
      buildRes(),
      next,
    );
    expect(mockLimit).toHaveBeenCalledWith('10.0.0.2');
  });

  it('allows request through when Redis is unreachable', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection failed'));

    const next = jest.fn();
    await adminAuthRateLimiter(
      buildReq('/api/auth/admin/set-role'),
      buildRes(),
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});

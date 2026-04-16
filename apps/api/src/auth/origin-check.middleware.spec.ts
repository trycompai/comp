import { originCheckMiddleware } from './origin-check.middleware';

// Mock isTrustedOrigin (async version)
jest.mock('./auth.server', () => ({
  isTrustedOrigin: async (origin: string) => {
    const staticOrigins = [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://app.trycomp.ai',
      'https://portal.trycomp.ai',
    ];
    if (staticOrigins.includes(origin)) return true;
    try {
      const url = new URL(origin);
      return (
        url.hostname.endsWith('.trycomp.ai') ||
        url.hostname.endsWith('.staging.trycomp.ai') ||
        url.hostname.endsWith('.trust.inc') ||
        url.hostname === 'trust.inc'
      );
    } catch {
      return false;
    }
  },
}));

function createMockReq(
  method: string,
  path: string,
  origin?: string,
): Record<string, unknown> {
  return {
    method,
    path,
    headers: origin ? { origin } : {},
  };
}

/** Flush the microtask queue so async middleware completes. */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function createMockRes(): Record<string, unknown> & {
  statusCode?: number;
  body?: unknown;
} {
  const res: Record<string, unknown> & { statusCode?: number; body?: unknown } =
    {};
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

describe('originCheckMiddleware', () => {
  it('should allow GET requests regardless of origin', () => {
    const req = createMockReq('GET', '/v1/controls', 'http://evil.com');
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow HEAD requests regardless of origin', () => {
    const req = createMockReq('HEAD', '/v1/health', 'http://evil.com');
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow OPTIONS requests regardless of origin', () => {
    const req = createMockReq('OPTIONS', '/v1/controls', 'http://evil.com');
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow POST from trusted origin', async () => {
    const req = createMockReq(
      'POST',
      '/v1/organization/api-keys',
      'http://localhost:3000',
    );
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
  });

  it('should block POST from untrusted origin', async () => {
    const req = createMockReq(
      'POST',
      '/v1/organization/transfer-ownership',
      'http://evil.com',
    );
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should block DELETE from untrusted origin', async () => {
    const req = createMockReq('DELETE', '/v1/organization', 'http://evil.com');
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should block PATCH from untrusted origin', async () => {
    const req = createMockReq(
      'PATCH',
      '/v1/members/123/role',
      'http://evil.com',
    );
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);
    await flushPromises();

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should allow POST without Origin header (API key / service token)', () => {
    const req = createMockReq('POST', '/v1/controls', undefined);
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow POST to /api/auth routes (better-auth exempt)', () => {
    const req = createMockReq('POST', '/api/auth/sign-in', 'http://evil.com');
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow POST to health check', () => {
    const req = createMockReq('POST', '/v1/health', 'http://evil.com');
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow production origins', async () => {
    const req = createMockReq(
      'POST',
      '/v1/organization/api-keys',
      'https://app.trycomp.ai',
    );
    const res = createMockRes();
    const next = jest.fn();

    originCheckMiddleware(req as any, res as any, next);
    await flushPromises();

    expect(next).toHaveBeenCalled();
  });
});

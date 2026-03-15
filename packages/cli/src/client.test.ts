import { describe, it, expect, afterEach, mock } from 'bun:test';

// Mock config module before importing client
mock.module('./config', () => ({
  getActiveEnv: () => ({
    apiUrl: 'http://localhost:9999',
  }),
  getActiveSession: () => ({
    token: 'test-session-token',
    email: 'admin@test.com',
    expiresAt: '2099-01-01T00:00:00.000Z',
  }),
}));

describe('adminFetch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should call fetch with correct URL and Bearer session token', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;

    const { adminFetch } = await import('./client');
    await adminFetch('stats');

    expect(capturedUrl).toBe('http://localhost:9999/v1/admin/stats');
    expect(capturedInit?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer test-session-token',
        'Content-Type': 'application/json',
      }),
    );
  });

  it('should return parsed JSON on success', async () => {
    const mockData = { organizations: 5, users: 10 };
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(mockData), { status: 200 })) as typeof fetch;

    const { adminFetch } = await import('./client');
    const result = await adminFetch('stats');

    expect(result).toEqual(mockData);
  });

  it('should pass custom method for POST requests', async () => {
    let capturedInit: RequestInit | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const { adminFetch } = await import('./client');
    await adminFetch('users/usr_1/platform-admin', { method: 'POST' });

    expect(capturedInit?.method).toBe('POST');
  });
});

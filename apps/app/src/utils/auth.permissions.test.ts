import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from './auth';

vi.mock('./permissions', () => ({ ac: {}, allRoles: {} }));

const mockFetch = vi.fn<typeof fetch>();
const requestHeaders = new Headers({ cookie: 'session=test' });

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});
afterEach(() => vi.unstubAllGlobals());

describe('API-owned permission checks', () => {
  it('sends the permissions evaluated by Better Auth and pins the authorized org', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: false })));

    const result = await auth.api.hasPermission({
      headers: requestHeaders,
      body: { organizationId: 'org_test', permission: { task: ['update'] } },
    });

    expect(result.success).toBe(false);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/auth/organization/has-permission');
    expect(options?.headers).toMatchObject({ cookie: 'session=test' });
    expect(JSON.parse(String(options?.body))).toEqual({
      organizationId: 'org_test',
      permissions: { task: ['update'] },
    });
  });

  it('keeps existing callers working without an explicit organization', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: true })));
    expect(
      await auth.api.hasPermission({
        headers: requestHeaders,
        body: { permission: { task: ['read'] } },
      }),
    ).toEqual({ success: true });
    expect(JSON.parse(String(mockFetch.mock.calls[0][1]?.body))).toEqual({
      permissions: { task: ['read'] },
    });
  });

  it.each([null, {}, { success: 'true' }])(
    'fails closed for malformed responses %j',
    async (body) => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify(body)));
      expect(
        (
          await auth.api.hasPermission({
            headers: requestHeaders,
            body: { permission: { task: ['update'] } },
          })
        ).success,
      ).toBe(false);
    },
  );

  it('fails closed when the API rejects the session', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 403 }));
    expect(
      (
        await auth.api.hasPermission({
          headers: requestHeaders,
          body: { permission: { task: ['update'] } },
        })
      ).success,
    ).toBe(false);
  });
});

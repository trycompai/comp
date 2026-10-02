import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callEnterpriseApi } from './enterprise-api';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
  vi.stubEnv('ENTERPRISE_API_SECRET', 'private-license-key');
  vi.stubEnv('NEXT_PUBLIC_ENTERPRISE_API_URL', 'https://enterprise.example');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('privileged enterprise transport', () => {
  it('rejects a foreign endpoint before sending the license credential', async () => {
    await expect(
      callEnterpriseApi({ endpoint: 'https://attacker.example/collect' }),
    ).rejects.toThrow('Invalid enterprise API endpoint');
    expect(mockFetch).not.toHaveBeenCalled();
  });
  it('pins the origin, encodes query parameters, and prohibits redirects', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } })),
    );
    await expect(
      callEnterpriseApi({
        endpoint: '/api/script',
        params: { key: 'org_1/script?&next=https://attacker.example' },
      }),
    ).resolves.toEqual({ ok: true });
    const [url, options] = mockFetch.mock.calls[0];
    expect(new URL(url).origin).toBe('https://enterprise.example');
    expect(new URL(url).searchParams.get('key')).toBe(
      'org_1/script?&next=https://attacker.example',
    );
    expect(options.redirect).toBe('error');
    expect(options.headers['x-api-secret']).toBe('private-license-key');
  });
  it('preserves raw successful enterprise responses', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: 'run_1', status: 'COMPLETED' })));
    await expect(callEnterpriseApi({ endpoint: '/api/run' })).resolves.toEqual({
      id: 'run_1',
      status: 'COMPLETED',
    });
  });
  it('fails when enterprise explicitly reports failure without an error string', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ success: false })));
    await expect(callEnterpriseApi({ endpoint: '/api/script' })).rejects.toThrow(
      'API request failed',
    );
  });
  it('fails when enterprise responds with an HTTP redirect', async () => {
    mockFetch.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://attacker.example' } }),
    );
    await expect(callEnterpriseApi({ endpoint: '/api/script' })).rejects.toThrow(
      'API request failed: 302',
    );
  });
  it('fails closed on missing license configuration', async () => {
    vi.stubEnv('ENTERPRISE_API_SECRET', '');
    await expect(callEnterpriseApi({ endpoint: '/api/script' })).rejects.toThrow(
      'require an enterprise license',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

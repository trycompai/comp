import { afterEach, describe, expect, it } from 'bun:test';
import type { IntegrationManifest } from '../../types';
import { createCheckContext, isTransientTransportError } from '../check-context';

// Minimal manifest for a dynamic single-fetch availability check (Neon/Cloudflare
// shape): api_key auth, one baseUrl, no checks defined in code.
const manifest: IntegrationManifest = {
  id: 'neon',
  name: 'Neon',
  description: 'test',
  category: 'Infrastructure',
  logoUrl: 'https://example.com/logo.png',
  auth: { type: 'api_key', config: { in: 'header', name: 'X-Api-Key' } },
  baseUrl: 'https://api.example.com',
  capabilities: ['checks'],
  isActive: true,
};

function makeCtx() {
  return createCheckContext({
    manifest,
    credentials: { api_key: 'k' },
    connectionId: 'conn_1',
    organizationId: 'org_1',
  });
}

// undici/Node surfaces a transport failure as `TypeError: fetch failed` with the
// underlying errno on `.cause` — exactly what a TCP reset / DNS blip looks like.
function fetchFailed(code: string): Error {
  const cause = Object.assign(new Error(`read ${code}`), { code });
  return Object.assign(new TypeError('fetch failed'), { cause });
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('isTransientTransportError', () => {
  it('classifies transport-level fetch errors as transient', () => {
    expect(isTransientTransportError(fetchFailed('ECONNRESET'))).toBe(true);
    expect(isTransientTransportError(fetchFailed('ETIMEDOUT'))).toBe(true);
    expect(isTransientTransportError(fetchFailed('EAI_AGAIN'))).toBe(true);
    expect(isTransientTransportError(new TypeError('fetch failed'))).toBe(true);
    expect(isTransientTransportError(new Error('socket hang up'))).toBe(true);
  });

  it('does NOT classify HTTP or parse errors as transient', () => {
    const httpErr = Object.assign(new Error('HTTP 403: Forbidden'), { status: 403 });
    expect(isTransientTransportError(httpErr)).toBe(false);
    expect(isTransientTransportError(new SyntaxError('Unexpected token < in JSON'))).toBe(false);
    expect(isTransientTransportError(null)).toBe(false);
    expect(isTransientTransportError(undefined)).toBe(false);
  });
});

describe('withRetry — transient transport errors (Neon/Cloudflare availability checks)', () => {
  it('retries a transient transport error and then succeeds', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) throw fetchFailed('ECONNRESET');
      return jsonResponse({ ok: true });
    }) as typeof fetch;

    const { ctx } = makeCtx();
    const data = await ctx.fetch<{ ok: boolean }>('/availability');

    expect(calls).toBe(2);
    expect(data).toEqual({ ok: true });
  }, 10000);

  it('still throws after exhausting retries on a persistent transport error', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      throw fetchFailed('ETIMEDOUT');
    }) as typeof fetch;

    const { ctx } = makeCtx();
    await expect(ctx.fetch('/availability')).rejects.toThrow();
    expect(calls).toBe(4); // initial attempt + MAX_RETRIES (3)
  }, 20000);
});

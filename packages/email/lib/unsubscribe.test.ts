import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('unsubscribe token signing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('UNSUBSCRIBE_SECRET', '');
    vi.stubEnv('AUTH_SECRET', '');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('can be imported without a secret but refuses to sign', async () => {
    const { generateUnsubscribeToken } = await import('./unsubscribe');
    expect(() => generateUnsubscribeToken('user@example.test')).toThrow('UNSUBSCRIBE_SECRET');
  });

  it('uses the configured secret rather than the public fallback', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-private-signing-key');
    const { generateUnsubscribeToken } = await import('./unsubscribe');
    const email = 'user@example.test';
    const forged = createHmac('sha256', 'fallback-secret').update(email).digest('base64url');
    const expected = createHmac('sha256', 'test-private-signing-key')
      .update(email)
      .digest('base64url');
    expect(generateUnsubscribeToken(email)).toBe(expected);
    expect(generateUnsubscribeToken(email)).not.toBe(forged);
  });

  it('prioritizes the dedicated key over the authentication key', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-unsubscribe-key');
    vi.stubEnv('AUTH_SECRET', 'test-auth-key');
    const { generateUnsubscribeToken } = await import('./unsubscribe');
    expect(generateUnsubscribeToken('user@example.test')).toBe(
      createHmac('sha256', 'test-unsubscribe-key').update('user@example.test').digest('base64url'),
    );
  });

  it('supports a configured authentication key for existing installations', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-auth-key');
    const { generateUnsubscribeToken } = await import('./unsubscribe');
    expect(generateUnsubscribeToken('user@example.test')).toBe(
      createHmac('sha256', 'test-auth-key').update('user@example.test').digest('base64url'),
    );
  });

  it('resolves the key at use time and invalidates tokens after rotation', async () => {
    const { generateUnsubscribeToken } = await import('./unsubscribe');
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-old-key');
    const old = generateUnsubscribeToken('user@example.test');
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-new-key');
    expect(generateUnsubscribeToken('user@example.test')).not.toBe(old);
  });

  it('binds each signature to its recipient', async () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'test-private-signing-key');
    const { generateUnsubscribeToken } = await import('./unsubscribe');
    expect(generateUnsubscribeToken('one@example.test')).not.toBe(
      generateUnsubscribeToken('two@example.test'),
    );
  });
});

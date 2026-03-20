/**
 * Tests for the getTrustedOrigins / isTrustedOrigin logic.
 *
 * Because auth.server.ts has side effects at module load time (better-auth
 * initialization, DB connections, validateSecurityConfig), we test the logic
 * in isolation rather than importing the module directly.
 */

function getTrustedOriginsLogic(authTrustedOrigins: string | undefined): string[] {
  if (authTrustedOrigins) {
    return authTrustedOrigins.split(',').map((o) => o.trim());
  }

  return [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3333',
    'https://app.trycomp.ai',
    'https://portal.trycomp.ai',
    'https://api.trycomp.ai',
    'https://app.staging.trycomp.ai',
    'https://portal.staging.trycomp.ai',
    'https://api.staging.trycomp.ai',
    'https://dev.trycomp.ai',
  ];
}

/**
 * Mirror of isStaticTrustedOrigin from auth.server.ts for isolated testing.
 * The full isTrustedOrigin is async (checks DB for custom domains) —
 * that path is tested via integration tests.
 */
function isStaticTrustedOriginLogic(
  origin: string,
  trustedOrigins: string[],
): boolean {
  if (trustedOrigins.includes(origin)) {
    return true;
  }

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
}

describe('getTrustedOrigins', () => {
  it('should return env-configured origins when AUTH_TRUSTED_ORIGINS is set', () => {
    const origins = getTrustedOriginsLogic('https://a.com, https://b.com');
    expect(origins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('should return hardcoded origins when AUTH_TRUSTED_ORIGINS is not set', () => {
    const origins = getTrustedOriginsLogic(undefined);
    expect(origins).toContain('https://app.trycomp.ai');
  });

  it('should never include wildcard origin', () => {
    const origins = getTrustedOriginsLogic(undefined);
    expect(origins.every((o: string) => o !== '*' && o !== 'true')).toBe(true);
  });

  it('should trim whitespace from comma-separated origins', () => {
    const origins = getTrustedOriginsLogic('  https://a.com  ,  https://b.com  ');
    expect(origins).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('isStaticTrustedOrigin', () => {
  const defaults = getTrustedOriginsLogic(undefined);

  it('should allow static trusted origins', () => {
    expect(isStaticTrustedOriginLogic('https://app.trycomp.ai', defaults)).toBe(true);
  });

  it('should allow trust portal subdomains of trycomp.ai', () => {
    expect(isStaticTrustedOriginLogic('https://security.trycomp.ai', defaults)).toBe(true);
    expect(isStaticTrustedOriginLogic('https://acme.trycomp.ai', defaults)).toBe(true);
  });

  it('should allow trust portal subdomains of staging.trycomp.ai', () => {
    expect(isStaticTrustedOriginLogic('https://security.staging.trycomp.ai', defaults)).toBe(true);
  });

  it('should allow trust.inc and its subdomains', () => {
    expect(isStaticTrustedOriginLogic('https://trust.inc', defaults)).toBe(true);
    expect(isStaticTrustedOriginLogic('https://acme.trust.inc', defaults)).toBe(true);
  });

  it('should reject unknown origins', () => {
    expect(isStaticTrustedOriginLogic('https://evil.com', defaults)).toBe(false);
    expect(isStaticTrustedOriginLogic('https://trycomp.ai.evil.com', defaults)).toBe(false);
  });

  it('should handle invalid origins gracefully', () => {
    expect(isStaticTrustedOriginLogic('not-a-url', defaults)).toBe(false);
  });

  it('main.ts should use isTrustedOrigin for CORS', () => {
    const fs = require('fs');
    const path = require('path');
    const mainTs = fs.readFileSync(
      path.join(__dirname, '..', 'main.ts'),
      'utf-8',
    ) as string;
    expect(mainTs).not.toContain('origin: true');
    expect(mainTs).toContain('isTrustedOrigin');
    expect(mainTs).toContain("import { isTrustedOrigin } from './auth/auth.server'");
  });
});

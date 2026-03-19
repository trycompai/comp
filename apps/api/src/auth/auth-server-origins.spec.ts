/**
 * Tests for the getTrustedOrigins logic.
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

  it('main.ts should use getTrustedOrigins instead of origin: true', () => {
    // Validate the CORS config change was made correctly by checking file content
    const fs = require('fs');
    const path = require('path');
    const mainTs = fs.readFileSync(
      path.join(__dirname, '..', 'main.ts'),
      'utf-8',
    ) as string;
    expect(mainTs).not.toContain('origin: true');
    expect(mainTs).toContain('origin: getTrustedOrigins()');
    expect(mainTs).toContain("import { getTrustedOrigins } from './auth/auth.server'");
  });
});

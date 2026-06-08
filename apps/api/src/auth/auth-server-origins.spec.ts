import {
  getBetterAuthTrustedOrigins,
  getCompExtensionTrustedOrigins,
  getTrustedOrigins,
  isChromeExtensionOrigin,
  isCompExtensionOriginAllowedForRequest,
  isStaticTrustedOrigin,
} from './origin-policy';

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

const originalAuthTrustedOrigins = process.env.AUTH_TRUSTED_ORIGINS;
const originalExtensionTrustedOrigins =
  process.env.COMP_EXTENSION_TRUSTED_ORIGINS;

beforeEach(() => {
  delete process.env.AUTH_TRUSTED_ORIGINS;
  delete process.env.COMP_EXTENSION_TRUSTED_ORIGINS;
});

afterAll(() => {
  restoreEnv('AUTH_TRUSTED_ORIGINS', originalAuthTrustedOrigins);
  restoreEnv(
    'COMP_EXTENSION_TRUSTED_ORIGINS',
    originalExtensionTrustedOrigins,
  );
});

describe('getTrustedOrigins', () => {
  it('should return env-configured origins when AUTH_TRUSTED_ORIGINS is set', () => {
    process.env.AUTH_TRUSTED_ORIGINS = 'https://a.com, https://b.com';

    expect(getTrustedOrigins()).toEqual(['https://a.com', 'https://b.com']);
  });

  it('should return hardcoded origins when AUTH_TRUSTED_ORIGINS is not set', () => {
    const origins = getTrustedOrigins();

    expect(origins).toContain('https://app.trycomp.ai');
  });

  it('should never include wildcard origin', () => {
    const origins = getTrustedOrigins();

    expect(origins.every((o: string) => o !== '*' && o !== 'true')).toBe(true);
  });

  it('should trim whitespace from comma-separated origins', () => {
    process.env.AUTH_TRUSTED_ORIGINS =
      '  https://a.com  ,  https://b.com  ';

    expect(getTrustedOrigins()).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('COMP_EXTENSION_TRUSTED_ORIGINS', () => {
  const extensionOrigin =
    'chrome-extension://panomgbokjppnleifmpcnpchjgpcngan';

  beforeEach(() => {
    process.env.COMP_EXTENSION_TRUSTED_ORIGINS = extensionOrigin;
  });

  it('should parse first-party extension origins separately', () => {
    expect(getCompExtensionTrustedOrigins()).toEqual([extensionOrigin]);
  });

  it('should include extension origins only in better-auth trusted origins', () => {
    expect(getBetterAuthTrustedOrigins()).toContain(extensionOrigin);
    expect(getTrustedOrigins()).not.toContain(extensionOrigin);
  });

  it('should allow extension origins only on extension routes', () => {
    expect(
      isCompExtensionOriginAllowedForRequest({
        method: 'POST',
        origin: extensionOrigin,
        path: '/v1/questionnaire/answer-single',
      }),
    ).toBe(true);
    expect(
      isCompExtensionOriginAllowedForRequest({
        method: 'GET',
        origin: extensionOrigin,
        path: '/v1/controls',
      }),
    ).toBe(false);
  });

  it('should reject wrong methods on extension paths', () => {
    expect(
      isCompExtensionOriginAllowedForRequest({
        method: 'POST',
        origin: extensionOrigin,
        path: '/v1/auth/me',
      }),
    ).toBe(false);
  });

  it('should reject allowed paths from unknown extension origins', () => {
    expect(
      isCompExtensionOriginAllowedForRequest({
        method: 'POST',
        origin: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        path: '/v1/questionnaire/answer-single',
      }),
    ).toBe(false);
  });

  it('should identify Chrome extension origins', () => {
    expect(isChromeExtensionOrigin(extensionOrigin)).toBe(true);
    expect(isChromeExtensionOrigin('https://app.trycomp.ai')).toBe(false);
  });
});

describe('isStaticTrustedOrigin', () => {
  it('should allow static trusted origins', () => {
    expect(isStaticTrustedOrigin('https://app.trycomp.ai')).toBe(true);
  });

  it('should allow trust portal subdomains of trycomp.ai', () => {
    expect(isStaticTrustedOrigin('https://security.trycomp.ai')).toBe(true);
    expect(isStaticTrustedOrigin('https://acme.trycomp.ai')).toBe(true);
  });

  it('should allow trust portal subdomains of staging.trycomp.ai', () => {
    expect(
      isStaticTrustedOrigin('https://security.staging.trycomp.ai'),
    ).toBe(true);
  });

  it('should allow trust.inc and its subdomains', () => {
    expect(isStaticTrustedOrigin('https://trust.inc')).toBe(true);
    expect(isStaticTrustedOrigin('https://acme.trust.inc')).toBe(true);
  });

  it('should reject unknown origins', () => {
    expect(isStaticTrustedOrigin('https://evil.com')).toBe(false);
    expect(
      isStaticTrustedOrigin('https://trycomp.ai.evil.com'),
    ).toBe(false);
  });

  it('should handle invalid origins gracefully', () => {
    expect(isStaticTrustedOrigin('not-a-url')).toBe(false);
  });

  it('main.ts should use path-aware CORS middleware', () => {
    const fs = require('fs');
    const path = require('path');
    const mainTs = fs.readFileSync(
      path.join(__dirname, '..', 'main.ts'),
      'utf-8',
    ) as string;
    expect(mainTs).not.toContain('origin: true');
    expect(mainTs).not.toContain('app.enableCors');
    expect(mainTs).toContain('app.use(corsOriginMiddleware)');
    expect(mainTs).toContain(
      "import { corsOriginMiddleware } from './auth/cors-origin.middleware'",
    );
  });
});

describe('getCustomDomains (structural)', () => {
  it('auth.server.ts should NOT filter by domainVerified in CORS domain query', () => {
    // Custom domains should be allowed for CORS as soon as they are configured
    // by an admin, not only after DNS verification completes. Vercel can serve
    // the trust portal before our domainVerified flag is set, causing CORS
    // failures on client-side API calls.
    const fs = require('fs');
    const path = require('path');
    const authServer = fs.readFileSync(
      path.join(__dirname, 'auth.server.ts'),
      'utf-8',
    ) as string;

    // Extract the getCustomDomains function body
    const fnMatch = authServer.match(
      /async function getCustomDomains[\s\S]*?^}/m,
    );
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];

    // Must NOT require domainVerified — that flag lags behind Vercel's own verification
    expect(fnBody).not.toContain('domainVerified');

    // Must still filter by published status
    expect(fnBody).toContain("status: 'published'");
  });

  it('auth.server.ts getCustomDomains should have independent error handling for Redis and DB', () => {
    const fs = require('fs');
    const path = require('path');
    const authServer = fs.readFileSync(
      path.join(__dirname, 'auth.server.ts'),
      'utf-8',
    ) as string;

    const fnMatch = authServer.match(
      /async function getCustomDomains[\s\S]*?^}/m,
    );
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];

    // Should have multiple try/catch blocks (Redis read, DB query, Redis write)
    const tryCatchCount = (fnBody.match(/\btry\s*\{/g) || []).length;
    expect(tryCatchCount).toBeGreaterThanOrEqual(3);
  });
});

describe('originCheckMiddleware (structural)', () => {
  it('should exempt trust-access paths from origin validation', () => {
    const fs = require('fs');
    const path = require('path');
    const middleware = fs.readFileSync(
      path.join(__dirname, 'origin-check.middleware.ts'),
      'utf-8',
    ) as string;

    // Trust-access endpoints are public (no auth, no cookies) — no CSRF risk
    expect(middleware).toContain('/v1/trust-access');
  });
});

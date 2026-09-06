import { describe, expect, test } from 'bun:test';
import { CYBEDEFEND_REGION_IDS, resolveRegion } from './regions';

describe('resolveRegion: public regions', () => {
  test('derives every URL for the EU region', () => {
    expect(resolveRegion({ region: 'eu' })).toEqual({
      apiBaseUrl: 'https://api-eu.cybedefend.com',
      logtoEndpoint: 'https://auth-eu.cybedefend.com',
      appBaseUrl: 'https://eu.cybedefend.com',
    });
  });

  test('derives every URL for the US region', () => {
    expect(resolveRegion({ region: 'us' })).toEqual({
      apiBaseUrl: 'https://api-us.cybedefend.com',
      logtoEndpoint: 'https://auth-us.cybedefend.com',
      appBaseUrl: 'https://us.cybedefend.com',
    });
  });

  test('rejects an unknown region rather than guessing one', () => {
    expect(() => resolveRegion({ region: 'elsewhere' })).toThrow(/unsupported cybedefend region/i);
  });

  test('rejects an empty region rather than falling back to a default', () => {
    expect(() => resolveRegion({ region: '' })).toThrow(/unsupported cybedefend region/i);
  });
});

describe('resolveRegion: dedicated tenants', () => {
  test('derives the URLs from the tenant name, on the same pattern as a region', () => {
    expect(resolveRegion({ region: 'dedicated', tenant: 'acme' })).toEqual({
      apiBaseUrl: 'https://api-acme.cybedefend.com',
      logtoEndpoint: 'https://auth-acme.cybedefend.com',
      appBaseUrl: 'https://acme.cybedefend.com',
    });
  });

  test('accepts hyphens and digits inside the tenant name', () => {
    expect(resolveRegion({ region: 'dedicated', tenant: 'acme-corp2' }).apiBaseUrl).toBe(
      'https://api-acme-corp2.cybedefend.com',
    );
  });

  test('normalises case and surrounding spaces', () => {
    expect(resolveRegion({ region: 'dedicated', tenant: '  ACME  ' }).apiBaseUrl).toBe(
      'https://api-acme.cybedefend.com',
    );
  });

  test('requires a tenant name when the dedicated option is chosen', () => {
    expect(() => resolveRegion({ region: 'dedicated' })).toThrow(/tenant name is required/i);
  });

  test('ignores a tenant name supplied alongside a public region', () => {
    expect(resolveRegion({ region: 'eu', tenant: 'acme' }).apiBaseUrl).toBe(
      'https://api-eu.cybedefend.com',
    );
  });
});

describe('resolveRegion: tenant names cannot smuggle a host', () => {
  // `https://api-${tenant}.cybedefend.com` is string interpolation: without a
  // strict allowlist a crafted tenant relocates the host entirely. The middle
  // case below resolves to evil.com, not cybedefend.com.
  test.each([
    ['userinfo and a path', 'x@evil.com/'],
    ['a bare host', 'evil.com'],
    ['a scheme', 'https://evil.com'],
    ['a port', 'acme:8080'],
    ['a path traversal', '../../evil'],
    ['a query string', 'acme?x=1'],
    ['a fragment', 'acme#evil.com'],
    ['whitespace', 'acme corp'],
    ['a leading hyphen', '-acme'],
    ['a trailing hyphen', 'acme-'],
    ['an underscore', 'acme_corp'],
    ['an empty name', ''],
    ['only whitespace', '   '],
  ])('refuses %s', (_label: string, tenant: string) => {
    expect(() => resolveRegion({ region: 'dedicated', tenant })).toThrow(/tenant name/i);
  });

  test('refuses a name longer than a DNS label allows', () => {
    expect(() => resolveRegion({ region: 'dedicated', tenant: 'a'.repeat(64) })).toThrow(
      /tenant name/i,
    );
  });

  test('every accepted tenant still resolves to a cybedefend.com host', () => {
    for (const tenant of ['acme', 'acme-corp2', 'tenant-1', 'a1']) {
      for (const url of Object.values(resolveRegion({ region: 'dedicated', tenant }))) {
        expect(new URL(url).hostname.endsWith('.cybedefend.com')).toBe(true);
        expect(new URL(url).protocol).toBe('https:');
      }
    }
  });
});

describe('shipped regions', () => {
  test('exposes the two public regions plus the dedicated option', () => {
    expect(CYBEDEFEND_REGION_IDS).toEqual(['eu', 'us', 'dedicated']);
  });

  test('every public region derives https CybeDefend hosts for itself', () => {
    // Locks the delivery requirement: no internal environment and no local
    // address can be reached through a region.
    for (const region of ['eu', 'us'] as const) {
      const { apiBaseUrl, logtoEndpoint, appBaseUrl } = resolveRegion({ region });

      expect(apiBaseUrl).toMatch(new RegExp(`^https://api-${region}\\.cybedefend\\.com$`));
      expect(logtoEndpoint).toMatch(new RegExp(`^https://auth-${region}\\.cybedefend\\.com$`));
      expect(appBaseUrl).toMatch(new RegExp(`^https://${region}\\.cybedefend\\.com$`));
    }
  });
});

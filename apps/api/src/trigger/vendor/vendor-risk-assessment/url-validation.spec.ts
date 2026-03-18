import {
  isUrlFromVendorDomain,
  extractVendorDomain,
  validateVendorUrl,
} from './url-validation';

// Mock the logger so tests don't need @trigger.dev/sdk
jest.mock('@trigger.dev/sdk', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('isUrlFromVendorDomain', () => {
  it('accepts exact domain match', () => {
    expect(isUrlFromVendorDomain('https://wix.com/privacy', 'wix.com')).toBe(
      true,
    );
  });

  it('accepts www subdomain', () => {
    expect(
      isUrlFromVendorDomain('https://www.wix.com/terms', 'wix.com'),
    ).toBe(true);
  });

  it('accepts other subdomains', () => {
    expect(
      isUrlFromVendorDomain('https://trust.wix.com', 'wix.com'),
    ).toBe(true);
    expect(
      isUrlFromVendorDomain('https://security.wix.com/page', 'wix.com'),
    ).toBe(true);
  });

  it('rejects completely different domains', () => {
    expect(isUrlFromVendorDomain('https://x.com/privacy', 'wix.com')).toBe(
      false,
    );
    expect(
      isUrlFromVendorDomain('https://twitter.com/wix', 'wix.com'),
    ).toBe(false);
  });

  it('rejects domains that end with vendor domain but are different', () => {
    // "notwix.com" ends with "wix.com" as a string, but is a different domain
    expect(
      isUrlFromVendorDomain('https://notwix.com/privacy', 'wix.com'),
    ).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(
      isUrlFromVendorDomain('https://WWW.WIX.COM/privacy', 'wix.com'),
    ).toBe(true);
    expect(
      isUrlFromVendorDomain('https://wix.com/privacy', 'WIX.COM'),
    ).toBe(true);
  });

  it('returns false for invalid URLs', () => {
    expect(isUrlFromVendorDomain('not-a-url', 'wix.com')).toBe(false);
  });
});

describe('extractVendorDomain', () => {
  it('extracts domain from full URL', () => {
    expect(extractVendorDomain('https://www.wix.com')).toBe('wix.com');
  });

  it('strips www prefix', () => {
    expect(extractVendorDomain('https://www.example.com/path')).toBe(
      'example.com',
    );
  });

  it('handles URLs without protocol', () => {
    expect(extractVendorDomain('wix.com')).toBe('wix.com');
    expect(extractVendorDomain('www.wix.com')).toBe('wix.com');
  });

  it('returns null for invalid input', () => {
    expect(extractVendorDomain('')).toBe(null);
  });

  it('preserves subdomains other than www', () => {
    expect(extractVendorDomain('https://trust.wix.com')).toBe('trust.wix.com');
  });
});

describe('validateVendorUrl', () => {
  it('returns normalized URL for valid vendor URLs', () => {
    expect(validateVendorUrl('https://wix.com/privacy', 'wix.com', 'privacy')).toBe(
      'https://wix.com/privacy',
    );
  });

  it('returns null for URLs from wrong domain', () => {
    expect(
      validateVendorUrl('https://x.com/privacy', 'wix.com', 'privacy'),
    ).toBe(null);
  });

  it('returns null for empty/null input', () => {
    expect(validateVendorUrl(null, 'wix.com', 'test')).toBe(null);
    expect(validateVendorUrl(undefined, 'wix.com', 'test')).toBe(null);
    expect(validateVendorUrl('', 'wix.com', 'test')).toBe(null);
  });

  it('normalizes bare domains by adding https', () => {
    expect(validateVendorUrl('wix.com/terms', 'wix.com', 'terms')).toBe(
      'https://wix.com/terms',
    );
  });

  it('accepts subdomain URLs', () => {
    expect(
      validateVendorUrl('https://trust.wix.com', 'wix.com', 'trust'),
    ).toBe('https://trust.wix.com/');
  });
});

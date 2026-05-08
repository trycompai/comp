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
    expect(isUrlFromVendorDomain('https://www.wix.com/terms', 'wix.com')).toBe(
      true,
    );
  });

  it('accepts other subdomains', () => {
    expect(isUrlFromVendorDomain('https://trust.wix.com', 'wix.com')).toBe(
      true,
    );
    expect(
      isUrlFromVendorDomain('https://security.wix.com/page', 'wix.com'),
    ).toBe(true);
  });

  it('rejects completely different domains', () => {
    expect(isUrlFromVendorDomain('https://x.com/privacy', 'wix.com')).toBe(
      false,
    );
    expect(isUrlFromVendorDomain('https://twitter.com/wix', 'wix.com')).toBe(
      false,
    );
  });

  it('rejects domains that end with vendor domain but are different', () => {
    // "notwix.com" ends with "wix.com" as a string, but is a different domain
    expect(isUrlFromVendorDomain('https://notwix.com/privacy', 'wix.com')).toBe(
      false,
    );
  });

  it('is case-insensitive', () => {
    expect(
      isUrlFromVendorDomain('https://WWW.WIX.COM/privacy', 'wix.com'),
    ).toBe(true);
    expect(isUrlFromVendorDomain('https://wix.com/privacy', 'WIX.COM')).toBe(
      true,
    );
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

  it('extracts root domain from subdomain websites', () => {
    expect(extractVendorDomain('https://app.slack.com')).toBe('slack.com');
    expect(extractVendorDomain('https://trust.wix.com')).toBe('wix.com');
    expect(extractVendorDomain('https://dashboard.stripe.com')).toBe(
      'stripe.com',
    );
  });

  it('extracts root domain from multi-level subdomains', () => {
    expect(extractVendorDomain('https://app.us.slack.com')).toBe('slack.com');
  });

  it('handles two-part TLDs correctly', () => {
    expect(extractVendorDomain('https://app.example.co.uk')).toBe(
      'example.co.uk',
    );
    expect(extractVendorDomain('https://www.example.com.au')).toBe(
      'example.com.au',
    );
  });
});

describe('validateVendorUrl', () => {
  it('returns normalized URL for valid vendor URLs', () => {
    expect(
      validateVendorUrl('https://wix.com/privacy', 'wix.com', 'privacy'),
    ).toBe('https://wix.com/privacy');
  });

  it('accepts URLs from any domain (domain filtering removed — trusts AI agent)', () => {
    expect(
      validateVendorUrl('https://x.com/privacy', 'wix.com', 'privacy'),
    ).toBe('https://x.com/privacy');
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
    expect(validateVendorUrl('https://trust.wix.com', 'wix.com', 'trust')).toBe(
      'https://trust.wix.com/',
    );
  });

  it('accepts parent domain URLs when vendor website is a subdomain', () => {
    // Vendor website is app.slack.com → domain extracts to slack.com
    // Privacy policy at slack.com/privacy should be accepted
    expect(
      validateVendorUrl('https://slack.com/privacy', 'slack.com', 'privacy'),
    ).toBe('https://slack.com/privacy');
  });

  it('accepts sibling subdomain URLs', () => {
    // Vendor website is app.slack.com → domain extracts to slack.com
    // Trust center at trust.slack.com should be accepted
    expect(
      validateVendorUrl('https://trust.slack.com', 'slack.com', 'trust'),
    ).toBe('https://trust.slack.com/');
  });
});

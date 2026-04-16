import type { VendorRiskAssessmentCertification } from './agent-types';
import { pickDeepScrapeSourceUrl } from './deep-scrape-source-url';

const cert = (
  overrides: Partial<VendorRiskAssessmentCertification> = {},
): VendorRiskAssessmentCertification => ({
  type: 'SOC 2 Type II',
  status: 'verified',
  issuedAt: null,
  expiresAt: null,
  url: null,
  ...overrides,
});

describe('pickDeepScrapeSourceUrl', () => {
  const vendorDomain = 'acme.com';

  it("prefers 'Trust & Security' link over 'Security Overview'", () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [
        { label: 'Security Overview', url: 'https://acme.com/security' },
        { label: 'Trust & Security', url: 'https://acme.com/trust' },
      ],
      certifications: [],
    });
    expect(result).toBe('https://acme.com/trust');
  });

  it("falls back to 'Security Overview' when no 'Trust & Security' link", () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [{ label: 'Security Overview', url: 'https://acme.com/security' }],
      certifications: [],
    });
    expect(result).toBe('https://acme.com/security');
  });

  it('falls back to a verified cert URL on the vendor domain when no labelled links match', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [
        cert({ url: 'https://acme.com/reports/soc2.pdf', status: 'verified' }),
      ],
    });
    expect(result).toBe('https://acme.com/reports/soc2.pdf');
  });

  it('skips subdomain-matching cert URL when status is not verified', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [
        cert({ url: 'https://trust.acme.com/iso', status: 'unknown' }),
      ],
    });
    expect(result).toBeNull();
  });

  it('accepts subdomain-matching cert URL (same registrable domain)', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [
        cert({ url: 'https://trust.acme.com/iso', status: 'verified' }),
      ],
    });
    expect(result).toBe('https://trust.acme.com/iso');
  });

  it('rejects off-domain labelled links', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [
        { label: 'Trust & Security', url: 'https://acme.trust.page' },
      ],
      certifications: [],
    });
    expect(result).toBeNull();
  });

  it('rejects off-domain verified cert URL', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [
        cert({ url: 'https://acme.safebase.io/soc2', status: 'verified' }),
      ],
    });
    expect(result).toBeNull();
  });

  it('rejects unparseable URLs', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [{ label: 'Trust & Security', url: 'not a url' }],
      certifications: [cert({ url: 'also not a url', status: 'verified' })],
    });
    expect(result).toBeNull();
  });

  it('returns null when everything is empty', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [],
    });
    expect(result).toBeNull();
  });

  it('returns first verified cert URL and ignores later verified certs', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [
        cert({
          type: 'SOC 2',
          status: 'verified',
          url: 'https://acme.com/first.pdf',
        }),
        cert({
          type: 'ISO 27001',
          status: 'verified',
          url: 'https://acme.com/second.pdf',
        }),
      ],
    });
    expect(result).toBe('https://acme.com/first.pdf');
  });

  it('skips verified certs whose URL is null and continues to next cert', () => {
    const result = pickDeepScrapeSourceUrl({
      vendorDomain,
      links: [],
      certifications: [
        cert({ type: 'SOC 2', status: 'verified', url: null }),
        cert({
          type: 'ISO 27001',
          status: 'verified',
          url: 'https://acme.com/iso.pdf',
        }),
      ],
    });
    expect(result).toBe('https://acme.com/iso.pdf');
  });
});

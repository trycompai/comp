import { deepScrapeTrustPortal } from './trust-portal-deep-scrape';
import type { VendorRiskAssessmentCertification } from './agent-types';

jest.mock('@trigger.dev/sdk', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'claude-mock-model'),
}));

const generateObjectMock = jest.fn();
jest.mock('ai', () => ({
  generateObject: (...args: unknown[]) => generateObjectMock(...args),
}));

type ScrapeMock = jest.Mock<
  Promise<{ markdown?: string; links?: string[] }>,
  [string, Record<string, unknown>?]
>;

function makeFirecrawlMock(scrape: ScrapeMock) {
  return { scrape } as unknown as import('@mendable/firecrawl-js').default;
}

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

describe('deepScrapeTrustPortal — gate', () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it('returns null when sourceUrl is null', async () => {
    const scrape = jest.fn();
    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: null,
      firecrawlClient: makeFirecrawlMock(scrape as ScrapeMock),
    });
    expect(result).toBeNull();
    expect(scrape).not.toHaveBeenCalled();
  });

  it('returns null when source URL is on a known third-party portal host', async () => {
    const scrape = jest.fn();
    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.trust.page',
      firecrawlClient: makeFirecrawlMock(scrape as ScrapeMock),
    });
    expect(result).toBeNull();
    expect(scrape).not.toHaveBeenCalled();
  });

  it('returns null when source URL is not on the vendor domain', async () => {
    const scrape = jest.fn();
    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://some-other-site.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape as ScrapeMock),
    });
    expect(result).toBeNull();
    expect(scrape).not.toHaveBeenCalled();
  });

  it('returns null when source URL is unparseable', async () => {
    const scrape = jest.fn();
    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'not a url',
      firecrawlClient: makeFirecrawlMock(scrape as ScrapeMock),
    });
    expect(result).toBeNull();
    expect(scrape).not.toHaveBeenCalled();
  });
});

// Suppress unused variable warning — cert() is referenced here to satisfy TS
void cert;

describe('deepScrapeTrustPortal — extraction', () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it('extracts SOC 2, ISO 27001, PCI-DSS from a Ubiquiti-shaped SPA trust portal', async () => {
    const sourceUrl = 'https://ui.com/us/en/trust-center';

    const scrape: ScrapeMock = jest
      .fn()
      // Initial scrape returns the landing page + all sidebar links
      .mockResolvedValueOnce({
        markdown: '# Secure by Design\nUbiquiti trust overview.',
        links: [
          'https://ui.com/us/en/trust-center',
          'https://ui.com/us/en/trust-center#philosophy',
          'https://ui.com/us/en/trust-center#ndaa-compliance',
          'https://ui.com/us/en/trust-center#cloud-security',
          'https://ui.com/us/en/trust-center#corporate-security',
        ],
      })
      // Per-section scrapes
      .mockResolvedValueOnce({ markdown: '# Philosophy\nSecurity first.' })
      .mockResolvedValueOnce({
        markdown:
          '# NDAA Compliance\nUbiquiti products are NDAA Section 889 compliant.',
      })
      .mockResolvedValueOnce({
        markdown:
          '# Cloud Security\n\nBadges: Soc 2 Type II, ISO/IEC 27001:2013, PCI-DSS. All verified.',
      })
      .mockResolvedValueOnce({
        markdown:
          '# Corporate Security\nPolicies covering employees and contractors.',
      });

    generateObjectMock.mockResolvedValueOnce({
      object: {
        certifications: [
          {
            type: 'SOC 2 Type II',
            status: 'verified',
            evidence_snippet: 'Soc 2 Type II',
          },
          {
            type: 'ISO 27001',
            status: 'verified',
            evidence_snippet: 'ISO/IEC 27001:2013',
          },
          {
            type: 'PCI DSS',
            status: 'verified',
            evidence_snippet: 'PCI-DSS',
          },
        ],
      },
    });

    const result = await deepScrapeTrustPortal({
      vendorName: 'Ubiquiti',
      vendorDomain: 'ui.com',
      sourceUrl,
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(3);
    expect(result?.map((c) => c.type).sort()).toEqual([
      'ISO 27001',
      'PCI DSS',
      'SOC 2 Type II',
    ]);
    expect(result?.every((c) => c.status === 'verified')).toBe(true);

    // 1 initial + 4 sections = 5 scrape calls
    expect(scrape).toHaveBeenCalledTimes(5);

    // First call should be the source URL with a wait action.
    expect(scrape).toHaveBeenNthCalledWith(
      1,
      sourceUrl,
      expect.objectContaining({
        formats: expect.arrayContaining(['markdown', 'links']),
        onlyMainContent: false,
      }),
    );

    // AI extraction called once with combined markdown.
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    const aiCall = generateObjectMock.mock.calls[0][0];
    expect(aiCall.prompt).toContain('Cloud Security');
    expect(aiCall.prompt).toContain('PCI-DSS');
  });

  it('continues with remaining sections when one scrape fails', async () => {
    const scrape: ScrapeMock = jest
      .fn()
      .mockResolvedValueOnce({
        markdown: '# Landing',
        links: [
          'https://acme.com/trust#one',
          'https://acme.com/trust#two',
        ],
      })
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce({
        markdown: '# Two\nWe are SOC 2 Type II verified.',
      });

    generateObjectMock.mockResolvedValueOnce({
      object: {
        certifications: [
          {
            type: 'SOC 2 Type II',
            status: 'verified',
            evidence_snippet: 'SOC 2 Type II verified',
          },
        ],
      },
    });

    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    expect(result).toEqual([
      expect.objectContaining({ type: 'SOC 2 Type II', status: 'verified' }),
    ]);
  });

  it('returns null when the initial scrape fails', async () => {
    const scrape: ScrapeMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('network error'));

    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    expect(result).toBeNull();
  });

  it('returns null when AI extraction throws', async () => {
    const scrape: ScrapeMock = jest.fn().mockResolvedValueOnce({
      markdown: '# Trust center content',
      links: [],
    });
    generateObjectMock.mockRejectedValueOnce(new Error('model error'));

    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    expect(result).toBeNull();
  });

  it('drops extracted certs whose evidence_snippet is empty', async () => {
    const scrape: ScrapeMock = jest.fn().mockResolvedValueOnce({
      markdown: '# Trust',
      links: [],
    });

    generateObjectMock.mockResolvedValueOnce({
      object: {
        certifications: [
          {
            type: 'SOC 2 Type II',
            status: 'verified',
            evidence_snippet: 'SOC 2 Type II report available on request',
          },
          { type: 'Totally Made Up Cert', status: 'verified', evidence_snippet: '' },
        ],
      },
    });

    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    expect(result).toHaveLength(1);
    expect(result?.[0].type).toBe('SOC 2 Type II');
  });

  it('runs AI extraction on initial markdown when there are no sidebar sections', async () => {
    const scrape: ScrapeMock = jest.fn().mockResolvedValueOnce({
      markdown:
        '# Trust\nWe hold SOC 2 Type II and ISO 27001 certifications.',
      links: [],
    });

    generateObjectMock.mockResolvedValueOnce({
      object: {
        certifications: [
          {
            type: 'SOC 2 Type II',
            status: 'verified',
            evidence_snippet: 'SOC 2 Type II',
          },
          {
            type: 'ISO 27001',
            status: 'verified',
            evidence_snippet: 'ISO 27001',
          },
        ],
      },
    });

    const result = await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    expect(scrape).toHaveBeenCalledTimes(1);
    expect(result?.map((c) => c.type).sort()).toEqual([
      'ISO 27001',
      'SOC 2 Type II',
    ]);
  });
});

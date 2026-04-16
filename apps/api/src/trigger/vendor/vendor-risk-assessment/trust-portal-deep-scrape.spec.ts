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

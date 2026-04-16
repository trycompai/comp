import { setupFirecrawlClient } from './firecrawl-agent-shared';

jest.mock('@trigger.dev/sdk', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@mendable/firecrawl-js', () =>
  jest.fn().mockImplementation(() => ({})),
);

describe('setupFirecrawlClient', () => {
  const originalApiKey = process.env.FIRECRAWL_API_KEY;

  beforeEach(() => {
    process.env.FIRECRAWL_API_KEY = 'test-key';
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.FIRECRAWL_API_KEY;
    } else {
      process.env.FIRECRAWL_API_KEY = originalApiKey;
    }
  });

  it('includes trust-center and compliance seed URLs for stronger portal discovery', () => {
    const setup = setupFirecrawlClient({
      vendorName: 'Ubiquiti',
      vendorWebsite: 'https://www.ui.com',
    });

    expect(setup).not.toBeNull();
    expect(setup?.seedUrls).toEqual(
      expect.arrayContaining([
        'https://www.ui.com',
        'https://www.ui.com/trust',
        'https://www.ui.com/trust-center',
        'https://www.ui.com/trust-center#cloud-security',
        'https://www.ui.com/trust-center#corporate-security',
        'https://www.ui.com/trust-center#ndaa-compliance',
        'https://www.ui.com/security',
        'https://www.ui.com/security/trust-center',
        'https://www.ui.com/security/compliance',
        'https://www.ui.com/security-and-compliance',
        'https://www.ui.com/compliance',
      ]),
    );

    // Keep seeds deduplicated to avoid wasting crawl credits.
    expect(new Set(setup?.seedUrls).size).toBe(setup?.seedUrls.length);
  });

  it('adds www fallback seeds when vendor website is an apex domain', () => {
    const setup = setupFirecrawlClient({
      vendorName: 'Ubiquiti',
      vendorWebsite: 'https://ui.com',
    });

    expect(setup).not.toBeNull();
    expect(setup?.seedUrls).toEqual(
      expect.arrayContaining([
        'https://ui.com',
        'https://ui.com/trust-center#cloud-security',
        'https://www.ui.com',
        'https://www.ui.com/trust-center',
        'https://www.ui.com/trust-center#cloud-security',
      ]),
    );
  });
});

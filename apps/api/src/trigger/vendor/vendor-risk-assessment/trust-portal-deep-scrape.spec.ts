import { deepScrapeTrustPortal } from './trust-portal-deep-scrape';

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
    // First generateObject call is identifySidebarTabs; return no tabs so
    // the flow proceeds straight to cert extraction.
    generateObjectMock.mockResolvedValueOnce({ object: { tabLabels: [] } });
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

    generateObjectMock.mockResolvedValueOnce({ object: { tabLabels: [] } });
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

    generateObjectMock.mockResolvedValueOnce({ object: { tabLabels: [] } });
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

  it('discovers SPA tab labels via LLM and scrapes each by clicking text', async () => {
    const scrape: ScrapeMock = jest
      .fn()
      .mockResolvedValueOnce({
        markdown:
          '# Secure by Design\nPhilosophy\nNDAA Compliance\nCloud Security',
        links: [], // No sidebar anchors — triggers tab-label discovery
      })
      .mockResolvedValueOnce({
        markdown: '# Philosophy\nWe believe in edge-first security.',
      })
      .mockResolvedValueOnce({
        markdown: '# Cloud Security\nSOC 2 Type II, ISO 27001, PCI-DSS.',
      });

    // First LLM call: sidebar tabs. Second: cert extraction.
    generateObjectMock.mockResolvedValueOnce({
      object: { tabLabels: ['Philosophy', 'Cloud Security'] },
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
      vendorName: 'Ubiquiti',
      vendorDomain: 'ui.com',
      sourceUrl: 'https://ui.com/trust-center',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    // 1 initial + 2 tab-label scrapes = 3 scrape calls
    expect(scrape).toHaveBeenCalledTimes(3);

    // Each tab scrape must use executeJavascript click-by-text actions.
    const tabCall = scrape.mock.calls[1];
    const actions =
      (tabCall[1] as { actions?: Array<{ type: string; script?: string }> })
        ?.actions ?? [];
    const jsAction = actions.find((a) => a.type === 'executeJavascript');
    expect(jsAction?.script).toBeDefined();
    expect(jsAction?.script).toContain('"Philosophy"');

    expect(result?.map((c) => c.type).sort()).toEqual([
      'ISO 27001',
      'SOC 2 Type II',
    ]);
  });

  it('escapes CSS special characters in anchor selectors', async () => {
    // Use a backslash in the anchor: `\` is a CSS special character that must
    // be escaped as `\\` inside attribute values, and it survives URL parsing
    // (unlike `"` which browsers percent-encode to `%22` in the fragment).
    const scrape: ScrapeMock = jest
      .fn()
      .mockResolvedValueOnce({
        markdown: '# Landing',
        links: ['https://acme.com/trust#weird\\section'],
      })
      .mockResolvedValueOnce({ markdown: '# Weird\nWe are ISO 27001 certified.' });

    generateObjectMock.mockResolvedValueOnce({
      object: {
        certifications: [
          {
            type: 'ISO 27001',
            status: 'verified',
            evidence_snippet: 'ISO 27001 certified',
          },
        ],
      },
    });

    await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl: 'https://acme.com/trust',
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    // The second call is the section scrape. Its selector should contain the
    // escaped backslash (`\\`) not the raw single backslash.
    const sectionCall = scrape.mock.calls[1];
    const actions = (sectionCall[1] as { actions?: Array<{ type: string; selector?: string }> })?.actions ?? [];
    const clickAction = actions.find((a) => a.type === 'click');
    expect(clickAction?.selector).toBeDefined();
    // cssEscapeAttr converts `\` → `\\`, so the selector contains `\\section`
    expect(clickAction?.selector).toContain('#weird\\\\section');
    // Raw single backslash should NOT appear unescaped in the selector string
    expect(clickAction?.selector).not.toMatch(/#weird\\[^\\]/);
  });

  it('scrapes every section exactly once when section count exceeds concurrency bound', async () => {
    const anchors = Array.from({ length: 8 }, (_, i) => `#section-${i}`);
    const sourceUrl = 'https://acme.com/trust';

    const scrape: ScrapeMock = jest.fn(async (url: string) => {
      if (url === sourceUrl) {
        return {
          markdown: '# Landing',
          links: anchors.map((a) => `${sourceUrl}${a}`),
        };
      }
      return { markdown: `# ${url}\nplaceholder` };
    }) as ScrapeMock;

    generateObjectMock.mockResolvedValueOnce({
      object: {
        certifications: [
          {
            type: 'SOC 2 Type II',
            status: 'verified',
            evidence_snippet: 'SOC 2 Type II',
          },
        ],
      },
    });

    await deepScrapeTrustPortal({
      vendorName: 'Acme',
      vendorDomain: 'acme.com',
      sourceUrl,
      firecrawlClient: makeFirecrawlMock(scrape),
    });

    // 1 initial + 8 sections = 9 scrape calls
    expect(scrape).toHaveBeenCalledTimes(9);

    // Each section URL should have been requested exactly once.
    const sectionCalls = scrape.mock.calls
      .slice(1)
      .map((call) => call[0] as string);
    expect(new Set(sectionCalls).size).toBe(8);
    for (const anchor of anchors) {
      expect(sectionCalls).toContain(`${sourceUrl}${anchor}`);
    }
  });
});

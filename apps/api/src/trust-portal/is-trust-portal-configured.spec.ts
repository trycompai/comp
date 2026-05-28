import { isTrustPortalConfigured } from './is-trust-portal-configured';

const DEFAULTS = {
  domain: null,
  contactEmail: null,
  overviewContent: null,
  favicon: null,
  faqs: null,
  frameworkFlags: [false, false, false],
  documentCount: 0,
  resourceCount: 0,
  customLinkCount: 0,
};

describe('isTrustPortalConfigured', () => {
  it('returns false for a fresh portal on all defaults', () => {
    expect(isTrustPortalConfigured(DEFAULTS)).toBe(false);
  });

  it('returns false when faqs is an empty array', () => {
    expect(isTrustPortalConfigured({ ...DEFAULTS, faqs: [] })).toBe(false);
  });

  it.each([
    ['domain', { domain: 'trust.acme.com' }],
    ['contactEmail', { contactEmail: 'security@acme.com' }],
    ['overviewContent', { overviewContent: 'We are secure.' }],
    ['favicon', { favicon: 'org/favicon.png' }],
    ['faqs', { faqs: [{ question: 'q', answer: 'a', order: 0 }] }],
    ['a framework flag', { frameworkFlags: [false, true, false] }],
    ['a document', { documentCount: 1 }],
    ['a compliance resource (certificate)', { resourceCount: 1 }],
    ['a custom link', { customLinkCount: 1 }],
  ])('returns true when %s is set', (_label, override) => {
    expect(isTrustPortalConfigured({ ...DEFAULTS, ...override })).toBe(true);
  });

  it('ignores non-array faqs values', () => {
    expect(isTrustPortalConfigured({ ...DEFAULTS, faqs: 'not-an-array' })).toBe(false);
  });

  it('returns false when frameworkFlags is an empty array', () => {
    expect(isTrustPortalConfigured({ ...DEFAULTS, frameworkFlags: [] })).toBe(false);
  });
});

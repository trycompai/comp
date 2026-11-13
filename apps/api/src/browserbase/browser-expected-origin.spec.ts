import {
  allowedCredentialHost,
  assertPageOnExpectedOrigin,
  UnexpectedPageOriginError,
} from './browser-expected-origin';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const VENDOR_ORIGIN = 'https://vendor.example.com';

// Frames and pages are faked down to what the guard reads: the page's URL and
// its frames' `location.href` / password-field probe. One shape serves both this
// spec and browser-credential-login.spec.ts.
const makeFrame = (input: {
  href?: string;
  hasPassword?: boolean;
  detached?: boolean;
}) => ({
  evaluate: jest.fn((expression: string) => {
    if (input.detached) return Promise.reject(new Error('frame detached'));
    if (expression.includes('location.href'))
      return Promise.resolve(input.href);
    return Promise.resolve(input.hasPassword ?? false);
  }),
});

type FakeFrame = ReturnType<typeof makeFrame>;

const makePage = (input: { url: string; frames?: FakeFrame[] }) => ({
  url: jest.fn(() => input.url),
  frames: jest.fn(() => input.frames ?? []),
});

type FakePage = ReturnType<typeof makePage>;

const makeStagehand = (pages: FakePage[]) => ({
  context: { pages: () => pages },
});

const run = (input: {
  url: string;
  expectedOrigin?: string;
  frames?: FakeFrame[];
  pages?: FakePage[];
  page?: FakePage;
}) =>
  assertPageOnExpectedOrigin({
    stagehand: makeStagehand(
      input.pages ?? [
        input.page ?? makePage({ url: input.url, frames: input.frames }),
      ],
    ) as unknown as Stagehand,
    expectedOrigin: input.expectedOrigin ?? VENDOR_ORIGIN,
    page: input.page as never,
  });

describe('allowedCredentialHost', () => {
  it.each([
    'https://vendor.example.com/login',
    'https://www.vendor.example.com/signin',
    'https://login.vendor.example.com/oauth2/authorize',
    'https://VENDOR.example.COM./login',
    'https://a.b.vendor.example.com/',
  ])('allows %s on the connection host family', (url) => {
    expect(
      allowedCredentialHost({ url, expectedOrigin: VENDOR_ORIGIN }),
    ).not.toBeNull();
  });

  it.each([
    ['twin domain', 'https://vendor.example.com.evil.net/login'],
    ['sibling domain', 'https://notvendor.example.com'],
    ['plain http', 'http://vendor.example.com/login'],
    ['non-default port', 'https://vendor.example.com:8443/login'],
    ['blank page', 'about:blank'],
    ['javascript url', 'javascript:alert(1)'],
    ['data url', 'data:text/html,<form></form>'],
    ['file url', 'file:///etc/passwd'],
    ['unparseable', 'not a url'],
    ['empty', ''],
  ])('refuses the %s', (_label, url) => {
    expect(
      allowedCredentialHost({ url, expectedOrigin: VENDOR_ORIGIN }),
    ).toBeNull();
  });

  it('normalises a www profile hostname to the same family', () => {
    expect(
      allowedCredentialHost({
        url: 'https://vendor.example.com/login',
        expectedOrigin: 'https://www.vendor.example.com',
      }),
    ).toBe('vendor.example.com');
  });

  it('keeps a deep profile hostname narrow on purpose (no public suffix list)', () => {
    const expectedOrigin = 'https://app.vendor.example.com';
    expect(
      allowedCredentialHost({
        url: 'https://www.app.vendor.example.com/login',
        expectedOrigin,
      }),
    ).not.toBeNull();
    expect(
      allowedCredentialHost({
        url: 'https://vendor.example.com',
        expectedOrigin,
      }),
    ).toBeNull();
    expect(
      allowedCredentialHost({
        url: 'https://login.vendor.example.com',
        expectedOrigin,
      }),
    ).toBeNull();
  });
});

describe('assertPageOnExpectedOrigin', () => {
  it('returns the active page when it is on the connection host family', async () => {
    const page = makePage({ url: 'https://login.vendor.example.com/signin' });
    const result = await run({ url: page.url(), page });
    expect(result).toBe(page);
  });

  it('refuses a page that has left the connection host, naming both hosts', async () => {
    const promise = run({ url: 'https://vendor-login.example.net/session' });
    await expect(promise).rejects.toBeInstanceOf(UnexpectedPageOriginError);
    await expect(promise).rejects.toMatchObject({
      code: 'unexpected_page_origin',
      expectedOrigin: VENDOR_ORIGIN,
      actualUrl: 'https://vendor-login.example.net/session',
    });
    await expect(promise).rejects.toThrow(/vendor-login\.example\.net/);
  });

  it.each([
    ['plain http', 'http://vendor.example.com/login'],
    ['non-default port', 'https://vendor.example.com:8443/login'],
    ['blank page', 'about:blank'],
  ])('refuses an %s page even on the right host', async (_label, url) => {
    await expect(run({ url })).rejects.toBeInstanceOf(
      UnexpectedPageOriginError,
    );
  });

  it('refuses when the session has no open page', async () => {
    await expect(run({ url: VENDOR_ORIGIN, pages: [] })).rejects.toBeInstanceOf(
      UnexpectedPageOriginError,
    );
  });

  it('checks the page it is given rather than the newest tab', async () => {
    const pinned = makePage({
      url: 'https://vendor-login.example.net/session',
    });
    const active = makePage({ url: 'https://vendor.example.com/login' });
    await expect(
      run({ url: active.url(), page: pinned, pages: [active] }),
    ).rejects.toBeInstanceOf(UnexpectedPageOriginError);
  });

  it('refuses a cross-origin frame that holds a password field', async () => {
    const frame = makeFrame({
      href: 'https://vendor.example.net/widget',
      hasPassword: true,
    });
    const promise = run({
      url: 'https://vendor.example.com/login',
      frames: [frame],
    });
    await expect(promise).rejects.toBeInstanceOf(UnexpectedPageOriginError);
    await expect(promise).rejects.toMatchObject({
      frameUrl: 'https://vendor.example.net/widget',
    });
  });

  it('allows a cross-origin frame with no credential field (recaptcha, analytics)', async () => {
    const frame = makeFrame({
      href: 'https://www.google.com/recaptcha/embed',
      hasPassword: false,
    });
    const page = makePage({
      url: 'https://vendor.example.com/login',
      frames: [frame],
    });
    await expect(run({ url: page.url(), page })).resolves.toBe(page);
  });

  it('ignores a detached frame it cannot read', async () => {
    const frame = makeFrame({ detached: true });
    const page = makePage({
      url: 'https://vendor.example.com/login',
      frames: [frame],
    });
    await expect(run({ url: page.url(), page })).resolves.toBe(page);
  });
});

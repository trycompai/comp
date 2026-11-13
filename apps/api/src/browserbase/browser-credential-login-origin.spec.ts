import {
  performCredentialLogin,
  reloginWithStoredCredentials,
} from './browser-credential-login';
import type { BrowserEvidenceSessionInput } from './browser-evidence-runner.service';
import { UnexpectedPageOriginError } from './browser-expected-origin';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import type { BrowserCredentialVaultAdapter } from './credential-vault';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const VENDOR_ORIGIN = 'https://vendor.example.com';
const HOSTILE_URL = 'https://vendor-login.example.net/session';

const makeFrame = (input: { href: string; hasPassword: boolean }) => ({
  evaluate: jest.fn((expression: string) =>
    Promise.resolve(
      expression.includes('location.href') ? input.href : input.hasPassword,
    ),
  ),
});

const makePage = ({
  url = `${VENDOR_ORIGIN}/login`,
  frames = [] as ReturnType<typeof makeFrame>[],
} = {}) => {
  let currentUrl = url;
  return {
    goto: jest.fn().mockResolvedValue(undefined),
    url: jest.fn(() => currentUrl),
    frames: jest.fn(() => frames),
    setUrl: (next: string) => {
      currentUrl = next;
    },
  };
};

type FakePage = ReturnType<typeof makePage>;

const makeStagehand = (page: FakePage) => ({
  act: jest.fn().mockResolvedValue(undefined),
  context: { pages: () => [page] },
});

const baseInput: BrowserEvidenceSessionInput = {
  organizationId: 'org_1',
  automationId: 'bau_1',
  runId: 'bar_1',
  targetUrl: `${VENDOR_ORIGIN}/app`,
  instruction: 'capture evidence',
  profile: {
    id: 'bap_1',
    hostname: 'vendor.example.com',
    contextId: 'ctx_1',
    vaultProvider: '1password',
    vaultExternalItemRef: 'op://v/i',
    vaultConnectionId: 'v',
  },
  sessionId: 'sess_1',
};

const FULL_CREDENTIALS = {
  username: 'alice',
  password: 'pw-s3cret',
  totpCode: '424242',
};

/** The instructions that carried a secret via Stagehand's `variables`. */
const secretInstructions = (act: jest.Mock): string[] =>
  (act.mock.calls as [string, { variables?: unknown }?][])
    .filter(([, options]) => options?.variables)
    .map(([instruction]) => instruction);

const startLogin = (input: {
  stagehand: ReturnType<typeof makeStagehand>;
  credentials?: typeof FULL_CREDENTIALS;
  expectedOrigin?: string;
}) => {
  const promise = performCredentialLogin({
    stagehand: input.stagehand as unknown as Stagehand,
    credentials: input.credentials ?? FULL_CREDENTIALS,
    expectedOrigin: input.expectedOrigin ?? VENDOR_ORIGIN,
    log: jest.fn(),
  });
  // Attach the rejection handler before timers advance, so a refusal is never an
  // unhandled rejection.
  const assertion = expect(promise).rejects.toBeInstanceOf(
    UnexpectedPageOriginError,
  );
  return { promise, assertion };
};

describe('performCredentialLogin origin guard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('refuses the password once the page has left the connection host', async () => {
    const page = makePage();
    const stagehand = makeStagehand(page);
    stagehand.act.mockImplementation((instruction: string) => {
      if (instruction.includes('%username%')) page.setUrl(HOSTILE_URL);
      return Promise.resolve();
    });

    const { assertion } = startLogin({ stagehand });
    await jest.runAllTimersAsync();
    await assertion;

    // The secret is never handed to Stagehand — not merely "the field stayed empty".
    const entered = secretInstructions(stagehand.act);
    expect(entered.some((i) => i.includes('%password%'))).toBe(false);
    expect(entered.some((i) => i.includes('%code%'))).toBe(false);
  });

  it('refuses every field when the page is already off the connection host', async () => {
    const page = makePage({ url: HOSTILE_URL });
    const stagehand = makeStagehand(page);

    const { assertion } = startLogin({ stagehand });
    await jest.runAllTimersAsync();
    await assertion;

    expect(secretInstructions(stagehand.act)).toEqual([]);
  });

  it.each([
    `${VENDOR_ORIGIN}/login`,
    `https://www.vendor.example.com/signin`,
    `https://login.vendor.example.com/oauth2/authorize`,
  ])(
    'fills when the page is on the connection host family (%s)',
    async (url) => {
      const page = makePage({ url });
      const stagehand = makeStagehand(page);

      const promise = performCredentialLogin({
        stagehand: stagehand as unknown as Stagehand,
        credentials: FULL_CREDENTIALS,
        expectedOrigin: VENDOR_ORIGIN,
        log: jest.fn(),
      });
      await jest.runAllTimersAsync();
      await promise;

      expect(secretInstructions(stagehand.act)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('%username%'),
          expect.stringContaining('%password%'),
          expect.stringContaining('%code%'),
        ]),
      );
    },
  );

  it.each([
    ['the twin domain', 'https://vendor.example.com.evil.net/login'],
    ['a downgrade to http', 'http://vendor.example.com/login'],
    ['a non-default port', 'https://vendor.example.com:8443/login'],
    ['a blank page', 'about:blank'],
  ])('refuses to type on %s', async (_label, url) => {
    const page = makePage({ url });
    const stagehand = makeStagehand(page);

    const { assertion } = startLogin({ stagehand });
    await jest.runAllTimersAsync();
    await assertion;

    expect(secretInstructions(stagehand.act)).toEqual([]);
  });

  it('refuses when a cross-origin frame holds the credential field', async () => {
    const frame = makeFrame({
      href: 'https://vendor.example.net/widget',
      hasPassword: true,
    });
    const stagehand = makeStagehand(makePage({ frames: [frame] }));

    const { assertion } = startLogin({ stagehand });
    await jest.runAllTimersAsync();
    await assertion;

    expect(secretInstructions(stagehand.act)).toEqual([]);
  });

  it('fills when the cross-origin frame has no credential field', async () => {
    const frame = makeFrame({
      href: 'https://www.google.com/recaptcha/embed',
      hasPassword: false,
    });
    const stagehand = makeStagehand(makePage({ frames: [frame] }));

    const promise = performCredentialLogin({
      stagehand: stagehand as unknown as Stagehand,
      credentials: FULL_CREDENTIALS,
      expectedOrigin: VENDOR_ORIGIN,
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    await promise;

    expect(secretInstructions(stagehand.act)).toContainEqual(
      expect.stringContaining('%password%'),
    );
  });
});

describe('reloginWithStoredCredentials origin guard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fails closed into a reconnect when the page leaves the connection host', async () => {
    const page = makePage();
    const stagehand = makeStagehand(page);
    stagehand.act.mockImplementation((instruction: string) => {
      if (instruction.includes('%username%')) page.setUrl(HOSTILE_URL);
      return Promise.resolve();
    });
    const verifyLoggedIn = jest.fn().mockResolvedValue(true);
    const vault: BrowserCredentialVaultAdapter = {
      resolveCredentialReference: jest.fn().mockResolvedValue(FULL_CREDENTIALS),
    };

    const promise = reloginWithStoredCredentials({
      stagehand: stagehand as unknown as Stagehand,
      sessions: {
        ensureActivePage: jest.fn().mockResolvedValue(page),
      } as unknown as BrowserbaseSessionService,
      vault,
      input: baseInput,
      verifyLoggedIn,
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.isLoggedIn).toBe(false);
    expect(result.reason).toMatch(/saved credentials/i);
    expect(result.reason).toContain('vendor-login.example.net');
    expect(verifyLoggedIn).not.toHaveBeenCalled();
  });
});

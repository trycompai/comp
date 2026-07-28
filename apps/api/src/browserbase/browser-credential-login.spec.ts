import {
  classifyTwoFactorMethod,
  performCredentialLogin,
  reloginWithStoredCredentials,
  safeOriginAndPath,
} from './browser-credential-login';
import type { BrowserCredentialVaultAdapter } from './credential-vault';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import type { BrowserEvidenceSessionInput } from './browser-evidence-runner.service';

type Stagehand = import('@browserbasehq/stagehand').Stagehand;

const makeStagehand = () => ({ act: jest.fn().mockResolvedValue(undefined) });
const makePage = () => ({ goto: jest.fn().mockResolvedValue(undefined) });
const makeSessions = (page: ReturnType<typeof makePage>) => ({
  ensureActivePage: jest.fn().mockResolvedValue(page),
});

const baseInput: BrowserEvidenceSessionInput = {
  organizationId: 'org_1',
  automationId: 'bau_1',
  runId: 'bar_1',
  targetUrl: 'https://vendor.example.com/app',
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

describe('performCredentialLogin', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fills each field in its own action with secrets passed via variables', async () => {
    const stagehand = makeStagehand();
    const password = 'sup3r-s3cret-passphrase';

    const promise = performCredentialLogin({
      stagehand: stagehand as unknown as Stagehand,
      credentials: { username: 'alice', password, totpCode: '424242' },
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    await promise;

    // act() does one thing per call, so username, password and the code are
    // each their own step (a single combined instruction would only fill one).
    const calls = stagehand.act.mock.calls as [string, unknown?][];
    const findCall = (needle: string) =>
      calls.find(([instruction]) => instruction.includes(needle));

    expect(findCall('%username%')?.[1]).toEqual({
      variables: { username: 'alice' },
    });
    expect(findCall('%password%')?.[1]).toEqual({ variables: { password } });
    expect(findCall('%code%')?.[1]).toEqual({ variables: { code: '424242' } });

    // No raw secret value may appear in any instruction sent to the LLM.
    for (const [instruction] of calls) {
      expect(instruction).not.toContain(password);
      expect(instruction).not.toContain('alice');
      expect(instruction).not.toContain('424242');
    }
  });

  it('switches a passkey prompt to the authenticator-code method when a code is stored', async () => {
    const stagehand = makeStagehand();

    const promise = performCredentialLogin({
      stagehand: stagehand as unknown as Stagehand,
      credentials: { username: 'alice', password: 'pw', totpCode: '424242' },
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    await promise;

    // With a code to fill and no human present, we auto-switch off a passkey so
    // the code field appears, then enter the stored code.
    const calls = stagehand.act.mock.calls as [string, unknown?][];
    const switchCall = calls.find(
      ([instruction]) =>
        instruction.includes('passkey') &&
        instruction.includes('authenticator app'),
    );
    expect(switchCall).toBeDefined();
  });

  it('reveals other sign-in methods without choosing one when a passkey blocks a take-over', async () => {
    const stagehand = makeStagehand();

    const promise = performCredentialLogin({
      stagehand: stagehand as unknown as Stagehand,
      credentials: { username: 'alice', password: 'pw' }, // no stored code → human take-over
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    await promise;

    // With no code to fill, a human takes over — we only surface the other
    // methods and never pick one, so the user chooses what they can complete.
    const calls = stagehand.act.mock.calls as [string, unknown?][];
    const revealCall = calls.find(
      ([instruction]) =>
        instruction.includes('passkey') &&
        instruction.includes('More options') &&
        instruction.includes('do NOT select'),
    );
    expect(revealCall).toBeDefined();
    // And it must NOT force the authenticator method (that would pick for them).
    const forcedSwitch = calls.find(([instruction]) =>
      instruction.includes('switch to the authenticator app'),
    );
    expect(forcedSwitch).toBeUndefined();
  });
});

describe('classifyTwoFactorMethod', () => {
  const makeStagehandWithExtract = (result: unknown) =>
    ({ extract: jest.fn().mockResolvedValue(result) }) as unknown as Stagehand;

  it('returns the classified method for each valid response', async () => {
    for (const method of [
      'code',
      'passkey',
      'passkey_only',
      'other',
    ] as const) {
      await expect(
        classifyTwoFactorMethod(makeStagehandWithExtract({ method })),
      ).resolves.toBe(method);
    }
  });

  it('degrades to "other" for a non-conforming or missing value', async () => {
    // Wrong shape (e.g. an outcome payload) — must not leak undefined.
    await expect(
      classifyTwoFactorMethod(makeStagehandWithExtract({ state: 'needs_2fa' })),
    ).resolves.toBe('other');
  });

  it('degrades to "other" when extraction throws', async () => {
    const stagehand = {
      extract: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Stagehand;
    await expect(classifyTwoFactorMethod(stagehand)).resolves.toBe('other');
  });
});

describe('reloginWithStoredCredentials', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const runRelogin = async (args: {
    stagehand: ReturnType<typeof makeStagehand>;
    sessions: ReturnType<typeof makeSessions>;
    vault: BrowserCredentialVaultAdapter;
    verifyLoggedIn: jest.Mock;
  }) => {
    const promise = reloginWithStoredCredentials({
      stagehand: args.stagehand as unknown as Stagehand,
      sessions: args.sessions as unknown as BrowserbaseSessionService,
      vault: args.vault,
      input: baseInput,
      verifyLoggedIn: args.verifyLoggedIn,
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    return promise;
  };

  it('does not attempt a login when no credentials are stored', async () => {
    const stagehand = makeStagehand();
    const page = makePage();
    const vault: BrowserCredentialVaultAdapter = {
      resolveCredentialReference: jest.fn().mockResolvedValue(null),
    };

    const result = await runRelogin({
      stagehand,
      sessions: makeSessions(page),
      vault,
      verifyLoggedIn: jest.fn().mockResolvedValue(false),
    });

    expect(result.isLoggedIn).toBe(false);
    expect(result.reason).toMatch(/no stored credentials/i);
    expect(stagehand.act).not.toHaveBeenCalled();
  });

  it('signs in and verifies on the landing page without forcing a return to the URL', async () => {
    const stagehand = makeStagehand();
    const page = makePage();
    const vault: BrowserCredentialVaultAdapter = {
      resolveCredentialReference: jest
        .fn()
        .mockResolvedValue({ username: 'alice', password: 'pw' }),
    };

    const result = await runRelogin({
      stagehand,
      sessions: makeSessions(page),
      vault,
      verifyLoggedIn: jest.fn().mockResolvedValue(true),
    });

    expect(result.isLoggedIn).toBe(true);
    expect(stagehand.act).toHaveBeenCalled();
    // We stay on the post-login landing page and verify there — navigating back
    // to the entered URL can return to a login page and read as a failed sign-in.
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('retries once with a freshly resolved TOTP code', async () => {
    const stagehand = makeStagehand();
    const page = makePage();
    const resolveCredentialReference = jest
      .fn()
      .mockResolvedValueOnce({
        username: 'alice',
        password: 'pw',
        totpCode: '111111',
      })
      .mockResolvedValueOnce({
        username: 'alice',
        password: 'pw',
        totpCode: '222222',
      });
    const vault: BrowserCredentialVaultAdapter = { resolveCredentialReference };
    const verifyLoggedIn = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await runRelogin({
      stagehand,
      sessions: makeSessions(page),
      vault,
      verifyLoggedIn,
    });

    expect(result.isLoggedIn).toBe(true);
    // Resolving twice proves the second attempt used a freshly generated code.
    expect(resolveCredentialReference).toHaveBeenCalledTimes(2);
  });

  it('gives up (user action required) when sign-in never authenticates', async () => {
    const stagehand = makeStagehand();
    const page = makePage();
    const vault: BrowserCredentialVaultAdapter = {
      resolveCredentialReference: jest
        .fn()
        .mockResolvedValue({ username: 'alice', password: 'pw' }),
    };

    const result = await runRelogin({
      stagehand,
      sessions: makeSessions(page),
      vault,
      verifyLoggedIn: jest.fn().mockResolvedValue(false),
    });

    expect(result.isLoggedIn).toBe(false);
    expect(result.reason).toMatch(/user action/i);
  });
});

describe('safeOriginAndPath (keeps auth secrets out of the LLM prompt)', () => {
  it('drops the query and fragment (OAuth code/state/tokens)', () => {
    expect(
      safeOriginAndPath(
        'https://login.example.com/callback?code=SECRET&state=xyz#access_token=abc',
      ),
    ).toBe('https://login.example.com/callback');
  });

  it('drops userinfo', () => {
    expect(safeOriginAndPath('https://user:pass@example.com/app')).toBe(
      'https://example.com/app',
    );
  });

  it('returns empty string for an unparseable or empty URL', () => {
    expect(safeOriginAndPath('not a url')).toBe('');
    expect(safeOriginAndPath('')).toBe('');
  });
});

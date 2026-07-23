import {
  performCredentialLogin,
  reloginWithStoredCredentials,
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

  it('passes secrets through act variables and never in the prompt text', async () => {
    const stagehand = makeStagehand();
    const password = 'sup3r-s3cret-passphrase';

    const promise = performCredentialLogin({
      stagehand: stagehand as unknown as Stagehand,
      credentials: { username: 'alice', password, totpCode: '424242' },
      log: jest.fn(),
    });
    await jest.runAllTimersAsync();
    await promise;

    expect(stagehand.act).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('%username%'),
      { variables: { username: 'alice', password } },
    );
    expect(stagehand.act).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('%code%'),
      { variables: { code: '424242' } },
    );

    // The actual secret values must not appear in the instruction sent to the LLM.
    const credentialInstruction = stagehand.act.mock.calls[0][0] as string;
    expect(credentialInstruction).not.toContain(password);
    expect(credentialInstruction).not.toContain('alice');
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

  it('signs in and returns to the target URL when verification passes', async () => {
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
    expect(stagehand.act).toHaveBeenCalledTimes(1);
    expect(page.goto).toHaveBeenCalledWith(
      baseInput.targetUrl,
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    );
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
    expect(resolveCredentialReference).toHaveBeenCalledTimes(2);
    // Two login attempts: each enters credentials + a TOTP code (2 acts each).
    expect(stagehand.act).toHaveBeenCalledTimes(4);
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

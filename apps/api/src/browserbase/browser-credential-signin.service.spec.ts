import { NotFoundException } from '@nestjs/common';
import { BrowserCredentialSigninService } from './browser-credential-signin.service';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import type { BrowserAuthProfileService } from './browser-auth-profile.service';
import { resolveBrowserCredentialVaultAdapter } from './browser-credential-vault.factory';

// Avoid instantiating the real Prisma client at import time (the service pulls
// in the profile service, which imports @db). Collaborators are mocked below.
jest.mock('@db', () => ({ db: {} }));

jest.mock('./browser-credential-vault.factory', () => ({
  resolveBrowserCredentialVaultAdapter: jest.fn(),
}));

const mockedResolveVault = resolveBrowserCredentialVaultAdapter as jest.Mock;

const profile = {
  id: 'prof_1',
  organizationId: 'org_1',
  hostname: 'app.example.com',
  contextId: 'ctx_1',
  vaultProvider: '1password',
  vaultExternalItemRef: 'op://vault/item',
  vaultConnectionId: 'vault',
};

function makeSessions(extract: jest.Mock, act: jest.Mock) {
  const page = { goto: jest.fn().mockResolvedValue(undefined) };
  return {
    createSessionWithContext: jest
      .fn()
      .mockResolvedValue({ sessionId: 'sess_1', liveViewUrl: '' }),
    createStagehand: jest.fn().mockResolvedValue({ extract, act }),
    ensureActivePage: jest.fn().mockResolvedValue(page),
    safeCloseStagehand: jest.fn().mockResolvedValue(undefined),
    closeSession: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProfiles(found: typeof profile | null) {
  return {
    getProfile: jest.fn().mockResolvedValue(found),
    markVerified: jest.fn().mockResolvedValue(found),
    markNeedsReauth: jest.fn().mockResolvedValue(found),
  };
}

const input = { organizationId: 'org_1', profileId: 'prof_1', url: 'https://app.example.com' };

describe('BrowserCredentialSigninService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedResolveVault.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  const run = async (
    sessions: ReturnType<typeof makeSessions>,
    profiles: ReturnType<typeof makeProfiles>,
  ) => {
    const service = new BrowserCredentialSigninService(
      sessions as unknown as BrowserbaseSessionService,
      profiles as unknown as BrowserAuthProfileService,
    );
    const promise = service.signInWithStoredCredentials(input);
    await jest.runAllTimersAsync();
    return promise;
  };

  it('marks verified without re-entering credentials when already signed in', async () => {
    const extract = jest.fn().mockResolvedValue({ isLoggedIn: true });
    const act = jest.fn().mockResolvedValue(undefined);
    const sessions = makeSessions(extract, act);
    const profiles = makeProfiles(profile);
    mockedResolveVault.mockReturnValue({
      resolveCredentialReference: jest.fn(),
    });

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(true);
    expect(profiles.markVerified).toHaveBeenCalledTimes(1);
    // Already in — no credential fill needed.
    expect(act).not.toHaveBeenCalled();
    expect(sessions.closeSession).toHaveBeenCalledWith('sess_1');
    expect(sessions.safeCloseStagehand).toHaveBeenCalledTimes(1);
  });

  it('signs in with stored credentials and marks verified', async () => {
    // Not logged in first, then logged in after the credential fill.
    const extract = jest
      .fn()
      .mockResolvedValueOnce({ isLoggedIn: false })
      .mockResolvedValue({ isLoggedIn: true });
    const act = jest.fn().mockResolvedValue(undefined);
    const sessions = makeSessions(extract, act);
    const profiles = makeProfiles(profile);
    mockedResolveVault.mockReturnValue({
      resolveCredentialReference: jest
        .fn()
        .mockResolvedValue({ username: 'user@x.com', password: 'secret' }),
    });

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(true);
    expect(act).toHaveBeenCalled();
    expect(profiles.markVerified).toHaveBeenCalledTimes(1);
    expect(profiles.markNeedsReauth).not.toHaveBeenCalled();
  });

  it('marks needs-reauth when the automated sign-in cannot complete', async () => {
    const extract = jest.fn().mockResolvedValue({ isLoggedIn: false });
    const act = jest.fn().mockResolvedValue(undefined);
    const sessions = makeSessions(extract, act);
    const profiles = makeProfiles(profile);
    // No resolvable credentials → relogin can't proceed.
    mockedResolveVault.mockReturnValue({
      resolveCredentialReference: jest.fn().mockResolvedValue(null),
    });

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(false);
    expect(profiles.markNeedsReauth).toHaveBeenCalledTimes(1);
    expect(profiles.markVerified).not.toHaveBeenCalled();
    expect(sessions.closeSession).toHaveBeenCalledWith('sess_1');
  });

  it('throws when the profile does not exist', async () => {
    const sessions = makeSessions(jest.fn(), jest.fn());
    const profiles = makeProfiles(null);
    const service = new BrowserCredentialSigninService(
      sessions as unknown as BrowserbaseSessionService,
      profiles as unknown as BrowserAuthProfileService,
    );

    // Rejects on the first microtask (no timers to flush before the throw).
    await expect(
      service.signInWithStoredCredentials(input),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(sessions.createSessionWithContext).not.toHaveBeenCalled();
  });
});

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

// `extract` classifies the page — return { state: <SignInOutcome> } per call.
function makeSessions(extract: jest.Mock, act: jest.Mock) {
  const page = {
    goto: jest.fn().mockResolvedValue(undefined),
    url: jest.fn().mockReturnValue('https://app.example.com/home'),
  };
  return {
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

const input = {
  organizationId: 'org_1',
  profileId: 'prof_1',
  url: 'https://app.example.com',
  sessionId: 'sess_1',
};

const withCredentials = (creds: Record<string, unknown> | null) =>
  mockedResolveVault.mockReturnValue({
    resolveCredentialReference: jest.fn().mockResolvedValue(creds),
  });

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

  it('connects to the given session and never closes it', async () => {
    const extract = jest.fn().mockResolvedValue({ state: 'logged_in' });
    const sessions = makeSessions(extract, jest.fn().mockResolvedValue(undefined));
    const profiles = makeProfiles(profile);
    withCredentials({ username: 'u', password: 'p' });

    await run(sessions, profiles);

    expect(sessions.createStagehand).toHaveBeenCalledWith('sess_1');
    // Release our automation handle, but leave the session open for the user.
    expect(sessions.safeCloseStagehand).toHaveBeenCalledTimes(1);
    expect(sessions.closeSession).not.toHaveBeenCalled();
  });

  it('marks verified without re-entering credentials when already signed in', async () => {
    const extract = jest.fn().mockResolvedValue({ state: 'logged_in' });
    const act = jest.fn().mockResolvedValue(undefined);
    const sessions = makeSessions(extract, act);
    const profiles = makeProfiles(profile);
    withCredentials({ username: 'u', password: 'p' });

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(true);
    expect(profiles.markVerified).toHaveBeenCalledTimes(1);
    expect(act).not.toHaveBeenCalled(); // already in — no navigation or fill
  });

  it('signs in with stored credentials and marks verified', async () => {
    const extract = jest
      .fn()
      .mockResolvedValueOnce({ state: 'unknown' })
      .mockResolvedValue({ state: 'logged_in' });
    const act = jest.fn().mockResolvedValue(undefined);
    const sessions = makeSessions(extract, act);
    const profiles = makeProfiles(profile);
    withCredentials({ username: 'user@x.com', password: 'secret' });

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(true);
    // The authenticated landing page is returned so runs can target it directly.
    expect(result.homeUrl).toBe('https://app.example.com/home');
    expect(act).toHaveBeenCalled(); // navigate to sign-in + fill
    expect(profiles.markVerified).toHaveBeenCalledTimes(1);
    expect(profiles.markNeedsReauth).not.toHaveBeenCalled();
  });

  it('reports invalid credentials as a failure and marks needs-reauth', async () => {
    const extract = jest
      .fn()
      .mockResolvedValueOnce({ state: 'unknown' })
      .mockResolvedValue({ state: 'invalid_credentials' });
    const sessions = makeSessions(extract, jest.fn().mockResolvedValue(undefined));
    const profiles = makeProfiles(profile);
    withCredentials({ username: 'user@x.com', password: 'wrong' });

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(false);
    expect(result.failure).toBe('invalid_credentials');
    expect(profiles.markNeedsReauth).toHaveBeenCalledTimes(1);
    expect(profiles.markVerified).not.toHaveBeenCalled();
    // Session stays open so the user can take over.
    expect(sessions.closeSession).not.toHaveBeenCalled();
  });

  it('reports needs_2fa when a two-factor prompt blocks an account with no seed', async () => {
    const extract = jest
      .fn()
      .mockResolvedValueOnce({ state: 'unknown' })
      .mockResolvedValue({ state: 'needs_2fa' });
    const sessions = makeSessions(extract, jest.fn().mockResolvedValue(undefined));
    const profiles = makeProfiles(profile);
    withCredentials({ username: 'user@x.com', password: 'secret' }); // no totpCode

    const result = await run(sessions, profiles);

    expect(result.isLoggedIn).toBe(false);
    expect(result.failure).toBe('needs_2fa');
    expect(profiles.markNeedsReauth).toHaveBeenCalledTimes(1);
  });

  it('throws when the profile does not exist', async () => {
    const sessions = makeSessions(jest.fn(), jest.fn());
    const profiles = makeProfiles(null);
    const service = new BrowserCredentialSigninService(
      sessions as unknown as BrowserbaseSessionService,
      profiles as unknown as BrowserAuthProfileService,
    );

    await expect(
      service.signInWithStoredCredentials(input),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(sessions.createStagehand).not.toHaveBeenCalled();
  });
});

import { BrowserLoginAnalyzerService } from './browser-login-analyzer.service';
import type { BrowserbaseSessionService } from './browserbase-session.service';
import type { LoginDetection } from './browser-login-analysis';

function makeSessions(extract: jest.Mock) {
  const page = { goto: jest.fn().mockResolvedValue(undefined) };
  return {
    createBrowserbaseContext: jest.fn().mockResolvedValue('ctx_1'),
    createSessionWithContext: jest
      .fn()
      .mockResolvedValue({ sessionId: 'sess_1', liveViewUrl: '' }),
    createStagehand: jest
      .fn()
      .mockResolvedValue({
        extract,
        act: jest.fn().mockResolvedValue(undefined),
      }),
    ensureActivePage: jest.fn().mockResolvedValue(page),
    safeCloseStagehand: jest.fn().mockResolvedValue(undefined),
    closeSession: jest.fn().mockResolvedValue(undefined),
  };
}

const passwordDetection: LoginDetection = {
  reachable: true,
  hasPasswordField: true,
  identifierType: 'email',
  ssoProviders: [],
  hasPasskey: false,
  extraFields: [],
};

describe('BrowserLoginAnalyzerService', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const run = async (
    sessions: ReturnType<typeof makeSessions>,
    url: string,
  ) => {
    const service = new BrowserLoginAnalyzerService(
      sessions as unknown as BrowserbaseSessionService,
    );
    const promise = service.analyzeLogin(url);
    await jest.runAllTimersAsync();
    return promise;
  };

  it('returns a ready recommendation and cleans up the session', async () => {
    const extract = jest.fn().mockResolvedValue(passwordDetection);
    const sessions = makeSessions(extract);

    const result = await run(
      sessions,
      'https://app.datadoghq.com/account/login',
    );

    expect(result.recommendation.category).toBe('ready');
    expect(sessions.safeCloseStagehand).toHaveBeenCalledTimes(1);
    expect(sessions.closeSession).toHaveBeenCalledWith('sess_1');
  });

  it('falls back to manual when the page cannot be read, and still cleans up', async () => {
    const extract = jest.fn().mockRejectedValue(new Error('page unreadable'));
    const sessions = makeSessions(extract);

    const result = await run(sessions, 'https://weird.example.com');

    expect(result.reachable).toBe(false);
    expect(result.recommendation.category).toBe('manual');
    expect(sessions.closeSession).toHaveBeenCalledWith('sess_1');
  });

  it('falls back to manual (no crash) when Browserbase is unavailable', async () => {
    const sessions = makeSessions(jest.fn());
    sessions.createBrowserbaseContext.mockRejectedValue(
      new Error('BROWSERBASE_API_KEY is missing'),
    );

    const result = await run(
      sessions,
      'https://app.datadoghq.com/account/login',
    );

    expect(result.reachable).toBe(false);
    expect(result.recommendation.category).toBe('manual');
    // No session was created, so nothing to close.
    expect(sessions.closeSession).not.toHaveBeenCalled();
  });
});

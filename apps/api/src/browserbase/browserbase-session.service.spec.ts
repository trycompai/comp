import { ServiceUnavailableException } from '@nestjs/common';
import Browserbase from '@browserbasehq/sdk';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { browserbaseUnavailableException } from './browserbase-upstream-error';

jest.mock('@browserbasehq/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

// Stagehand is loaded via a dynamic ESM import that jest cannot intercept, so
// tests spy on the loadStagehand() seam and supply a fake constructor instead.
type StagehandClass = Awaited<
  ReturnType<BrowserbaseSessionService['loadStagehand']>
>;

const mockStagehandClass = ({
  init,
  close,
}: {
  init: jest.Mock;
  close: jest.Mock;
}): StagehandClass =>
  jest.fn().mockImplementation(() => ({ init, close })) as unknown as StagehandClass;

type BrowserbaseClient = ReturnType<
  BrowserbaseSessionService['getBrowserbase']
>;

const prematureCloseError = () =>
  Object.assign(new Error('Invalid response body: Premature close'), {
    code: 'ERR_STREAM_PREMATURE_CLOSE',
  });

type MockBrowserbaseClientInput = {
  createContext?: jest.Mock;
  createSession?: jest.Mock;
  debugSession?: jest.Mock;
  retrieveSession?: jest.Mock;
  updateSession?: jest.Mock;
};

const mockBrowserbaseClient = ({
  createContext = jest.fn(),
  createSession = jest.fn(),
  debugSession = jest.fn(),
  retrieveSession = jest.fn(),
  updateSession = jest.fn(),
}: MockBrowserbaseClientInput): BrowserbaseClient =>
  ({
    contexts: {
      create: createContext,
    },
    sessions: {
      create: createSession,
      debug: debugSession,
      retrieve: retrieveSession,
      update: updateSession,
    },
  }) as unknown as BrowserbaseClient;

describe('BrowserbaseSessionService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('requests identity encoded Browserbase API responses', () => {
    const service = new BrowserbaseSessionService();

    service.getBrowserbase();

    expect(jest.mocked(Browserbase)).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultHeaders: { 'accept-encoding': 'identity' },
      }),
    );
  });

  it('retries transient Browserbase context creation failures', async () => {
    jest.useFakeTimers();
    const service = new BrowserbaseSessionService();
    const createContext = jest
      .fn()
      .mockRejectedValueOnce(prematureCloseError())
      .mockResolvedValueOnce({ id: 'ctx_1' });
    jest
      .spyOn(service, 'getBrowserbase')
      .mockReturnValue(mockBrowserbaseClient({ createContext }));

    const promise = service.createBrowserbaseContext();
    await jest.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toBe('ctx_1');
    expect(createContext).toHaveBeenCalledTimes(2);
  });

  it('returns a service unavailable exception after retry exhaustion', async () => {
    jest.useFakeTimers();
    const service = new BrowserbaseSessionService();
    const createContext = jest.fn().mockRejectedValue(prematureCloseError());
    jest
      .spyOn(service, 'getBrowserbase')
      .mockReturnValue(mockBrowserbaseClient({ createContext }));

    const promise = service.createBrowserbaseContext();
    const expectation = expect(promise).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await jest.advanceTimersByTimeAsync(1_000);

    await expectation;
    expect(createContext).toHaveBeenCalledTimes(3);
  });

  it('preserves non-retryable Browserbase failures', async () => {
    const service = new BrowserbaseSessionService();
    const browserbaseError = Object.assign(
      new Error('Browserbase rejected request'),
      { status: 400 },
    );
    const createContext = jest.fn().mockRejectedValue(browserbaseError);
    jest
      .spyOn(service, 'getBrowserbase')
      .mockReturnValue(mockBrowserbaseClient({ createContext }));

    await expect(service.createBrowserbaseContext()).rejects.toBe(
      browserbaseError,
    );
    expect(createContext).toHaveBeenCalledTimes(1);
  });

  it('retries transient Browserbase session retrieval failures', async () => {
    jest.useFakeTimers();
    const service = new BrowserbaseSessionService();
    const retrieveSession = jest
      .fn()
      .mockRejectedValueOnce(prematureCloseError())
      .mockResolvedValueOnce({ contextId: 'ctx_1' });
    jest
      .spyOn(service, 'getBrowserbase')
      .mockReturnValue(mockBrowserbaseClient({ retrieveSession }));

    const promise = service.getSessionContextId('session_1');
    await jest.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toBe('ctx_1');
    expect(retrieveSession).toHaveBeenCalledTimes(2);
    expect(retrieveSession).toHaveBeenCalledWith('session_1');
  });

  it('retries transient Browserbase live view lookup failures', async () => {
    jest.useFakeTimers();
    const service = new BrowserbaseSessionService();
    const createSession = jest.fn().mockResolvedValue({ id: 'session_1' });
    const debugSession = jest
      .fn()
      .mockRejectedValueOnce(prematureCloseError())
      .mockResolvedValueOnce({
        debuggerFullscreenUrl: 'https://live.browserbase.test/session_1',
      });
    jest.spyOn(service, 'getBrowserbase').mockReturnValue(
      mockBrowserbaseClient({
        createSession,
        debugSession,
      }),
    );

    const promise = service.createSessionWithContext('ctx_1');
    await jest.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toEqual({
      sessionId: 'session_1',
      liveViewUrl: 'https://live.browserbase.test/session_1',
    });
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(debugSession).toHaveBeenCalledTimes(2);
  });

  it('retries transient Stagehand init failures', async () => {
    jest.useFakeTimers();
    const service = new BrowserbaseSessionService();
    const init = jest
      .fn()
      .mockRejectedValueOnce(prematureCloseError())
      .mockResolvedValueOnce(undefined);
    const close = jest.fn().mockResolvedValue(undefined);
    const StagehandCtor = mockStagehandClass({ init, close });
    jest.spyOn(service, 'loadStagehand').mockResolvedValue(StagehandCtor);

    const promise = service.createStagehand('session_1');
    await jest.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toEqual({ init, close });
    expect(StagehandCtor).toHaveBeenCalledTimes(2);
    expect(init).toHaveBeenCalledTimes(2);
    // The partially-initialized instance is closed before retrying.
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('throws a service unavailable exception after Stagehand init retry exhaustion', async () => {
    jest.useFakeTimers();
    const service = new BrowserbaseSessionService();
    const init = jest.fn().mockRejectedValue(prematureCloseError());
    const close = jest.fn().mockResolvedValue(undefined);
    jest
      .spyOn(service, 'loadStagehand')
      .mockResolvedValue(mockStagehandClass({ init, close }));

    const promise = service.createStagehand('session_1');
    const expectation = expect(promise).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await jest.advanceTimersByTimeAsync(1_000);

    await expectation;
    expect(init).toHaveBeenCalledTimes(3);
    expect(close).toHaveBeenCalledTimes(3);
  });

  it('preserves non-retryable Stagehand init failures', async () => {
    const service = new BrowserbaseSessionService();
    const sessionNotFound = Object.assign(new Error('Session not found'), {
      status: 404,
    });
    const init = jest.fn().mockRejectedValue(sessionNotFound);
    const close = jest.fn().mockResolvedValue(undefined);
    jest
      .spyOn(service, 'loadStagehand')
      .mockResolvedValue(mockStagehandClass({ init, close }));

    await expect(service.createStagehand('session_1')).rejects.toBe(
      sessionNotFound,
    );
    expect(init).toHaveBeenCalledTimes(1);
    // Even a non-retryable failure closes the partial instance.
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('navigateToUrl returns the friendly unavailable message when init keeps failing', async () => {
    const service = new BrowserbaseSessionService();
    jest
      .spyOn(service, 'createStagehand')
      .mockRejectedValue(browserbaseUnavailableException());

    await expect(
      service.navigateToUrl('session_1', 'https://github.com'),
    ).resolves.toEqual({
      success: false,
      error: 'Browserbase is temporarily unavailable. Please retry in a moment.',
    });
  });
});

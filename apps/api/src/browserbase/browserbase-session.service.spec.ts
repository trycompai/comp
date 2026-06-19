import { ServiceUnavailableException } from '@nestjs/common';
import Browserbase from '@browserbasehq/sdk';
import { BrowserbaseSessionService } from './browserbase-session.service';

jest.mock('@browserbasehq/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
}));

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
});

import { ServiceUnavailableException } from '@nestjs/common';
import { BrowserbaseSessionService } from './browserbase-session.service';

type BrowserbaseClient = ReturnType<BrowserbaseSessionService['getBrowserbase']>;

const prematureCloseError = () =>
  Object.assign(new Error('Invalid response body: Premature close'), {
    code: 'ERR_STREAM_PREMATURE_CLOSE',
  });

const mockBrowserbaseClient = ({
  createContext,
}: {
  createContext: jest.Mock;
}): BrowserbaseClient =>
  ({
    contexts: {
      create: createContext,
    },
  }) as unknown as BrowserbaseClient;

describe('BrowserbaseSessionService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
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
});

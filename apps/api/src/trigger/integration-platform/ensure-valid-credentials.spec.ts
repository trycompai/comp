import { requestValidCredentials } from './ensure-valid-credentials';

function createAbortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

describe('requestValidCredentials', () => {
  const originalServiceToken = process.env.SERVICE_TOKEN_TRIGGER;

  afterEach(() => {
    process.env.SERVICE_TOKEN_TRIGGER = originalServiceToken;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('times out requests that do not respond', async () => {
    jest.useFakeTimers();
    process.env.SERVICE_TOKEN_TRIGGER = 'service-token';

    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(createAbortError()),
            { once: true },
          );
        }),
    );

    const resultPromise = requestValidCredentials({
      apiUrl: 'https://api.example.com',
      connectionId: 'conn_1',
      organizationId: 'org_1',
    });

    jest.advanceTimersByTime(30_000);

    await expect(resultPromise).resolves.toEqual({
      success: false,
      error: 'Timed out after 30000ms while requesting valid credentials',
    });
  });
});

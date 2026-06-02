import { BackgroundCheckIdentityClient } from './background-check-identity.client';

describe('BackgroundCheckIdentityClient idempotency key', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BACKGROUND_CHECK_API_KEY: 'bc_test',
      BACKGROUND_CHECK_API_BASE_URL: 'https://identity.test',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  function mockFetchOk() {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: 'check_1', status: 'invited' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  function keyFrom(fetchMock: jest.Mock): string {
    const init = fetchMock.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    return init.headers['Idempotency-Key'];
  }

  const params = {
    organizationId: 'org_1',
    memberId: 'mem_1',
    employeeName: 'Ada',
    employeeEmail: 'ada@example.com',
    requesterEmail: 'admin@example.com',
  };

  it('forwards the provided idempotency key as the Idempotency-Key header', async () => {
    const fetchMock = mockFetchOk();
    await new BackgroundCheckIdentityClient().createBackgroundCheck({
      ...params,
      idempotencyKey: 'comp-background-check:bcr_1',
    });
    expect(keyFrom(fetchMock)).toBe('comp-background-check:bcr_1');
  });

  it('forwards a per-attempt retry idempotency key unchanged', async () => {
    const fetchMock = mockFetchOk();
    await new BackgroundCheckIdentityClient().createBackgroundCheck({
      ...params,
      idempotencyKey: 'comp-background-check:bcr_1:2',
    });
    expect(keyFrom(fetchMock)).toBe('comp-background-check:bcr_1:2');
  });
});

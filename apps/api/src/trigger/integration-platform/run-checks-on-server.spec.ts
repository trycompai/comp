import { runChecksOnServer } from './run-checks-on-server';

describe('runChecksOnServer', () => {
  const ORIGINAL_TOKEN = process.env.SERVICE_TOKEN_TRIGGER;
  const params = {
    apiUrl: 'http://api',
    connectionId: 'conn_1',
    organizationId: 'org_1',
  };

  beforeEach(() => {
    process.env.SERVICE_TOKEN_TRIGGER = 'svc-token';
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.SERVICE_TOKEN_TRIGGER;
    else process.env.SERVICE_TOKEN_TRIGGER = ORIGINAL_TOKEN;
  });

  it('POSTs to the internal endpoint with service token + org header and returns the result', async () => {
    const runResult = { results: [{}], totalFindings: 1, totalPassing: 2 };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => runResult,
    } as unknown as Response);

    const result = await runChecksOnServer({
      ...params,
      checkId: 'aws-s3-public-access',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api/v1/integrations/internal/run-connection-checks/conn_1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-service-token': 'svc-token',
          'x-organization-id': 'org_1',
        }),
        body: JSON.stringify({ checkId: 'aws-s3-public-access' }),
      }),
    );
    expect(result).toEqual(runResult);
  });

  it('sends an empty body when no checkId is given (run all)', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as unknown as Response);

    await runChecksOnServer(params);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({}) }),
    );
  });

  it('throws with the server message on a non-2xx response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: 'boom' }),
    } as unknown as Response);

    await expect(runChecksOnServer(params)).rejects.toThrow('boom');
  });

  it('throws when SERVICE_TOKEN_TRIGGER is not configured', async () => {
    delete process.env.SERVICE_TOKEN_TRIGGER;
    await expect(runChecksOnServer(params)).rejects.toThrow(
      'SERVICE_TOKEN_TRIGGER is not configured',
    );
  });
});

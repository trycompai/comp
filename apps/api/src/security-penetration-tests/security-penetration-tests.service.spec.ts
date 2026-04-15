import { HttpException, HttpStatus } from '@nestjs/common';
import { db } from '@db';
import { createHash } from 'node:crypto';
import type { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import type { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';
import { SecurityPenetrationTestsService } from './security-penetration-tests.service';

const mockCredentialVaultService: jest.Mocked<
  Pick<CredentialVaultService, 'getDecryptedCredentials'>
> = {
  getDecryptedCredentials: jest.fn(),
};

jest.mock('@db', () => ({
  db: {
    securityPenetrationTestRun: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    secret: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    integrationProvider: {
      findUnique: jest.fn(),
    },
    integrationConnection: {
      findFirst: jest.fn(),
    },
  },
}));

type MockDb = {
  securityPenetrationTestRun: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  secret: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  integrationProvider: {
    findUnique: jest.Mock;
  };
  integrationConnection: {
    findFirst: jest.Mock;
  };
};

describe('SecurityPenetrationTestsService', () => {
  const originalFetch = global.fetch;
  const originalMacedApiKey = process.env.MACED_API_KEY;
  const originalWebhookBase =
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL;
  const defaultWebhookToken = 'test-webhook-token';
  const defaultWebhookTokenHash = createHash('sha256')
    .update(defaultWebhookToken)
    .digest('hex');
  const fetchMock = jest.fn();
  const mockedDb = db as unknown as MockDb;
  let service: SecurityPenetrationTestsService;

  beforeAll(() => {
    process.env.MACED_API_KEY = 'test-maced-api-key';
  });

  afterAll(() => {
    process.env.MACED_API_KEY = originalMacedApiKey;
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL = originalWebhookBase;
    if (originalFetch) {
      global.fetch = originalFetch;
    }
  });

  beforeEach(() => {
    process.env.MACED_API_KEY = 'test-maced-api-key';
    service = new SecurityPenetrationTestsService(
      mockCredentialVaultService as unknown as CredentialVaultService,
    );
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    mockedDb.securityPenetrationTestRun.upsert.mockResolvedValue({});
    mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
      organizationId: 'org_123',
    });
    mockedDb.securityPenetrationTestRun.findMany.mockResolvedValue([
      { providerRunId: 'run_123' },
    ]);
    mockedDb.secret.upsert.mockResolvedValue({});
    mockedDb.secret.findUnique.mockResolvedValue({
      id: 'sec_default',
      value: JSON.stringify({
        tokenHash: defaultWebhookTokenHash,
        createdAt: '2026-03-01T00:00:00.000Z',
      }),
    });
    mockedDb.secret.update.mockResolvedValue({});
    // Default: no GitHub integration connected — getGithubTokenForOrg returns null
    mockedDb.integrationProvider.findUnique.mockResolvedValue(null);
    mockedDb.integrationConnection.findFirst.mockResolvedValue(null);
    mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue(null);
    jest.clearAllMocks();
  });

  it('lists reports with organization context', async () => {
    const expectedPayload = [
      {
        id: 'run_123',
        status: 'completed',
      },
    ];

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(expectedPayload), { status: 200 }),
    );

    const result = await service.listReports('org_123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.maced.ai/v1/pentests',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-maced-api-key',
        }),
      }),
    );
    expect(result).toEqual(expectedPayload);
  });

  it('creates report payload with resolved webhook URL', async () => {
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL =
      'https://api.trycomp.ai/webhook';
    const expectedPayload = {
      id: 'run_456',
      status: 'provisioning',
      webhookToken: 'provider-issued-token',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(expectedPayload), { status: 200 }),
    );

    const payload: CreatePenetrationTestDto = {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      testMode: true,
    };

    await service.createReport('org_123', payload);

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://api.trycomp.ai/webhook/v1/security-penetration-tests/webhook',
    );
    expect(requestBody.targetUrl).toBe(payload.targetUrl);
    expect(requestBody.repoUrl).toBe(payload.repoUrl);
    expect(requestBody.testMode).toBe(true);
    expect(requestBody).not.toHaveProperty(
      'webhookUrl',
      'https://report-callback.example.com/webhook',
    );
    expect(mockedDb.secret.upsert).toHaveBeenCalledTimes(1);
    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledTimes(1);
  });

  it('uses production webhook default when webhook URL is not provided or configured', async () => {
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL = '';

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_default_webhook',
          status: 'provisioning',
          webhookToken: 'provider-issued-token',
        }),
        { status: 200 },
      ),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
    });

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://api.trycomp.ai/v1/security-penetration-tests/webhook',
    );
  });

  it('returns 502 when provider create response omits webhook token for Comp webhook callbacks', async () => {
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL =
      'https://api.trycomp.ai/webhook';

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_missing_token',
          status: 'provisioning',
        }),
        { status: 200 },
      ),
    );

    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error:
            'Penetration test was created at provider but webhook handshake token was missing',
        },
      }),
    );

    expect(mockedDb.secret.upsert).not.toHaveBeenCalled();
    expect(mockedDb.securityPenetrationTestRun.upsert).not.toHaveBeenCalled();
  });

  it('returns 502 when webhook handshake persistence fails', async () => {
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL =
      'https://api.trycomp.ai/webhook';
    mockedDb.secret.upsert.mockRejectedValue(new Error('db unavailable'));

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_handshake_retry',
          status: 'provisioning',
          webhookToken: 'provider-issued-token',
        }),
        { status: 200 },
      ),
    );

    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error:
            'Penetration test was created at provider but webhook handshake could not be persisted',
        },
      }),
    );

    expect(mockedDb.secret.upsert).toHaveBeenCalledTimes(3);
    expect(mockedDb.securityPenetrationTestRun.upsert).not.toHaveBeenCalled();
  });

  it('persists ownership using create response id', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_from_id_field',
          status: 'provisioning',
        }),
        { status: 200 },
      ),
    );

    const result = await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
    });

    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          providerRunId: 'run_from_id_field',
        },
      }),
    );
    expect(result.id).toBe('run_from_id_field');
  });

  it('returns 502 when ownership persistence fails', async () => {
    mockedDb.securityPenetrationTestRun.upsert.mockRejectedValue(
      new Error('db unavailable'),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_ownership_retry',
          status: 'provisioning',
        }),
        { status: 200 },
      ),
    );

    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error:
            'Penetration test was created at provider but ownership mapping could not be persisted',
        },
      }),
    );

    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledTimes(3);
  });

  it('rejects relative webhook URLs', async () => {
    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
        webhookUrl: '/v1/security-penetration-tests/webhook-route',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: {
          message: 'webhookUrl must be a valid absolute URL',
        },
      }),
    );
  });

  it('handles non-json create response as mapped 502', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('unexpected payload', { status: 200 }),
    );

    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error: 'Invalid response received from penetration test provider',
        },
      }),
    );
  });

  it('returns empty list for empty payload', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(service.listReports('org_123')).resolves.toEqual([]);
  });

  it('maps invalid list payload to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not-json', { status: 200 }));

    await expect(service.listReports('org_123')).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error: 'Invalid response received from penetration test provider',
        },
      }),
    );
  });

  it('normalizes unversioned webhook route to canonical v1 webhook route', async () => {
    const expectedPayload = {
      id: 'run_789',
      status: 'provisioning',
      webhookToken: 'provider-token',
    };
    const webhookUrl =
      'https://app.company.test/security-penetration-tests/webhook';

    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL = webhookUrl;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(expectedPayload), { status: 200 }),
    );

    const payload: CreatePenetrationTestDto = {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl,
    };

    await service.createReport('org_123', payload);

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://app.company.test/v1/security-penetration-tests/webhook',
    );
  });

  it('allows third-party webhook URLs without requiring provider webhook token', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_external_callback',
          status: 'provisioning',
        }),
        { status: 200 },
      ),
    );

    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
        webhookUrl: 'https://external-webhook.example.com/callback',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'run_external_callback',
      }),
    );

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://external-webhook.example.com/callback/v1/security-penetration-tests/webhook',
    );
    expect(mockedDb.secret.upsert).not.toHaveBeenCalled();
    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledTimes(1);
  });

  it('normalizes legacy /api/security/penetration-tests/webhook route to canonical v1 route', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_api_legacy',
          status: 'provisioning',
          webhookToken: 'provider-token',
        }),
        { status: 200 },
      ),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl:
        'https://app.company.test/api/security/penetration-tests/webhook?foo=bar',
    });

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://app.company.test/v1/security-penetration-tests/webhook?foo=bar',
    );
  });

  it('keeps provided webhook route plus query params', async () => {
    const expectedPayload = {
      id: 'run_qp',
      status: 'provisioning',
    };

    const webhookUrl =
      'https://app.company.test/v1/security-penetration-tests/webhook?foo=bar';

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(expectedPayload), { status: 200 }),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl,
    });

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://app.company.test/v1/security-penetration-tests/webhook?foo=bar',
    );
  });

  it('supports absolute webhook URLs that require appending the expected endpoint', async () => {
    const expectedPayload = {
      id: 'run_101',
      status: 'provisioning',
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(expectedPayload), { status: 200 }),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl: 'https://callback.example.com/hook',
    });

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://callback.example.com/hook/v1/security-penetration-tests/webhook',
    );
  });

  it('strips webhookToken query parameter before forwarding webhook URL to provider', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_strip_token',
          status: 'provisioning',
          webhookToken: 'provider-token',
        }),
        { status: 200 },
      ),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl:
        'https://callback.example.com/hook/v1/security-penetration-tests/webhook?foo=bar&webhookToken=user-token',
    });

    const [, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body as string) as Record<
      string,
      unknown
    >;

    expect(requestBody.webhookUrl).toBe(
      'https://callback.example.com/hook/v1/security-penetration-tests/webhook?foo=bar',
    );
  });

  it('throws HttpException when report payload is invalid JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('unexpected payload', { status: 200 }),
    );

    await expect(
      service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        repoUrl: 'https://github.com/org/repo',
      }),
    ).rejects.toThrow(HttpException);
  });

  it('reads webhook status and report id from provider payload', () => {
    const webhookResult = service.handleWebhook(
      {
        id: 'run_webhook',
        status: 'completed',
      },
      {
        webhookToken: defaultWebhookToken,
      },
    );

    return expect(webhookResult).resolves.toEqual({
      success: true,
      organizationId: 'org_123',
      reportId: 'run_webhook',
      status: 'completed',
      eventType: 'status',
    });
  });

  it('validates persisted per-job webhook token and records event metadata', async () => {
    mockedDb.secret.findUnique.mockResolvedValueOnce({
      id: 'sec_1',
      value: JSON.stringify({
        tokenHash: createHash('sha256').update('job-token').digest('hex'),
        createdAt: '2026-03-01T00:00:00.000Z',
      }),
    });

    const webhookResult = await service.handleWebhook(
      {
        id: 'run_webhook',
        status: 'completed',
      },
      {
        webhookToken: 'job-token',
        eventId: 'evt_1',
      },
    );

    expect(webhookResult).toEqual({
      success: true,
      organizationId: 'org_123',
      reportId: 'run_webhook',
      status: 'completed',
      eventType: 'status',
    });
    expect(mockedDb.secret.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_name: {
          organizationId: 'org_123',
          name: 'security_penetration_test_webhook_run_webhook',
        },
      },
      select: {
        id: true,
        value: true,
      },
    });
    expect(mockedDb.secret.update).toHaveBeenCalledTimes(1);
  });

  it('marks webhook event as duplicate when event id repeats', async () => {
    mockedDb.secret.findUnique.mockResolvedValueOnce({
      id: 'sec_2',
      value: JSON.stringify({
        tokenHash: createHash('sha256').update('job-token').digest('hex'),
        createdAt: '2026-03-01T00:00:00.000Z',
        lastEventId: 'evt_duplicate',
      }),
    });

    const webhookResult = await service.handleWebhook(
      {
        id: 'run_webhook',
        status: 'completed',
      },
      {
        webhookToken: 'job-token',
        eventId: 'evt_duplicate',
      },
    );

    expect(webhookResult).toEqual({
      success: true,
      organizationId: 'org_123',
      reportId: 'run_webhook',
      status: 'completed',
      eventType: 'status',
      duplicate: true,
    });
  });

  it('rejects webhook when run ownership mapping does not exist', async () => {
    mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.handleWebhook(
        {
          id: 'run_missing',
          status: 'completed',
        },
        {
          webhookToken: defaultWebhookToken,
        },
      ),
    ).rejects.toThrow(HttpException);
  });

  it('uses reportStatus when id status fields are absent in webhook payload', () => {
    const webhookResult = service.handleWebhook(
      {
        id: 'run_from_run_id',
        reportStatus: 'queued',
      },
      {
        webhookToken: defaultWebhookToken,
      },
    );

    return expect(webhookResult).resolves.toEqual({
      success: true,
      organizationId: 'org_123',
      reportId: 'run_from_run_id',
      status: 'queued',
      eventType: 'status',
    });
  });

  it('maps Maced completion webhook payload to completed status with report summary', () => {
    const webhookResult = service.handleWebhook(
      {
        id: 'run_completed',
        report: {
          markdown: '# Penetration test',
          costUsd: 49.11,
          durationMs: 265000,
          agentCount: 4,
        },
      },
      {
        webhookToken: defaultWebhookToken,
      },
    );

    return expect(webhookResult).resolves.toEqual({
      success: true,
      organizationId: 'org_123',
      reportId: 'run_completed',
      status: 'completed',
      eventType: 'completed',
      report: {
        costUsd: 49.11,
        durationMs: 265000,
        agentCount: 4,
        hasMarkdown: true,
      },
    });
  });

  it('maps Maced failed webhook payload to failed status with failure details', () => {
    const webhookResult = service.handleWebhook(
      {
        id: 'run_failed',
        error: 'Workflow exited early',
        failedAt: '2026-02-28T21:30:00Z',
      },
      {
        webhookToken: defaultWebhookToken,
      },
    );

    return expect(webhookResult).resolves.toEqual({
      success: true,
      organizationId: 'org_123',
      reportId: 'run_failed',
      status: 'failed',
      eventType: 'failed',
      failure: {
        error: 'Workflow exited early',
        failedAt: '2026-02-28T21:30:00Z',
      },
    });
  });

  it('throws when MACED API key is missing', async () => {
    process.env.MACED_API_KEY = '';
    const serviceWithoutKey = new SecurityPenetrationTestsService(
      mockCredentialVaultService as unknown as CredentialVaultService,
    );

    await expect(serviceWithoutKey.listReports('org_123')).rejects.toThrow(
      'Maced API key not configured on server',
    );
  });

  it('fetches report output as binary payload', async () => {
    const fixtureContent = 'markdown report body';
    const fixtureBuffer = new TextEncoder().encode(fixtureContent);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_output',
          organizationId: 'org_123',
          status: 'completed',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(fixtureBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
        },
      }),
    );

    const output = await service.getReportOutput('org_123', 'run_output');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.maced.ai/v1/pentests/run_output/report/raw',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-maced-api-key',
        }),
      }),
    );
    expect(output.buffer).toEqual(Buffer.from(fixtureBuffer));
    expect(output.contentType).toBe('text/markdown; charset=utf-8');
  });

  it('falls back to markdown content type when response omits content-type', async () => {
    const fixtureContent = 'raw report';
    const fixtureBuffer = new TextEncoder().encode(fixtureContent);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_output_no_type',
          organizationId: 'org_123',
          status: 'completed',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(fixtureBuffer, {
        status: 200,
      }),
    );

    const output = await service.getReportOutput(
      'org_123',
      'run_output_no_type',
    );

    expect(output.contentType).toBe('text/markdown; charset=utf-8');
    expect(output.contentDisposition).toBeNull();
    expect(output.buffer).toEqual(Buffer.from(fixtureBuffer));
  });

  it('gets report data by id', async () => {
    const fixtureReport = { id: 'run_123', status: 'completed' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(fixtureReport), { status: 200 }),
    );

    const report = await service.getReport('org_123', 'run_123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.maced.ai/v1/pentests/run_123',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-maced-api-key',
        }),
      }),
    );
    expect(report).toEqual(fixtureReport);
  });

  it('maps invalid get report response to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('invalid-json', { status: 200 }),
    );

    await expect(service.getReport('org_123', 'run_123')).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error: 'Invalid response received from penetration test provider',
        },
      }),
    );
  });

  it('maps empty get report response to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(service.getReport('org_123', 'run_123')).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error: 'Empty response while fetching penetration test',
        },
      }),
    );
  });

  it('maps empty get progress response to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(
      service.getReportProgress('org_123', 'run_123'),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error: 'Empty response while fetching penetration test progress',
        },
      }),
    );
  });

  it('maps invalid report progress payload to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 200 }));

    await expect(
      service.getReportProgress('org_123', 'run_123'),
    ).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_GATEWAY,
        response: {
          error: 'Invalid response received from penetration test provider',
        },
      }),
    );
  });

  it('generates fallback PDF file details when disposition is missing', async () => {
    const fixtureContent = 'pdf report content';
    const fixtureBuffer = new TextEncoder().encode(fixtureContent);

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_pdf',
          organizationId: 'org_123',
          status: 'completed',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(fixtureBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
        },
      }),
    );

    const output = await service.getReportPdf('org_123', 'run_pdf');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.maced.ai/v1/pentests/run_pdf/report/pdf',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-maced-api-key',
        }),
      }),
    );
    expect(output.buffer).toEqual(Buffer.from(fixtureBuffer));
    expect(output.contentType).toBe('application/pdf');
    expect(output.contentDisposition).toBe(
      'attachment; filename="penetration-test-run_pdf.pdf"',
    );
  });

  it('throws a mapped HttpException for failed provider calls', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"server error"}', {
        status: HttpStatus.BAD_REQUEST,
      }),
    );

    await expect(service.getReport('org_123', 'missing')).rejects.toEqual(
      expect.objectContaining({
        status: HttpStatus.BAD_REQUEST,
        response: {
          error: 'server error',
        },
      }),
    );
  });
});

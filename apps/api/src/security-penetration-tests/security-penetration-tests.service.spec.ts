import { HttpException, HttpStatus } from '@nestjs/common';
import { db } from '@db';
import { validate } from 'class-validator';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import type { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import type { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';
import type { PentestCreditsService } from './pentest-credits.service';
import { SecurityPenetrationTestsService } from './security-penetration-tests.service';

const mockCredentialVaultService: jest.Mocked<
  Pick<CredentialVaultService, 'getDecryptedCredentials'>
> = {
  getDecryptedCredentials: jest.fn(),
};

// All createReport tests assume an org with credits. Tests that exercise the
// 0-balance path override `getStatus` to return balance: 0.
const mockPentestCreditsService: jest.Mocked<
  Pick<
    PentestCreditsService,
    'getStatus' | 'debitOrThrow' | 'refund' | 'writePentestAuditEntry'
  >
> = {
  getStatus: jest.fn(),
  debitOrThrow: jest.fn(),
  refund: jest.fn(),
  writePentestAuditEntry: jest.fn(),
};

const mockBillingEntitlementsService: jest.Mocked<
  Pick<
    BillingEntitlementsService,
    'tryConsumeIncludedUsageForProduct' | 'refundIncludedUsageForProduct'
  >
> = {
  tryConsumeIncludedUsageForProduct: jest.fn(),
  refundIncludedUsageForProduct: jest.fn(),
};

jest.mock('@db', () => ({
  db: {
    securityPenetrationTestRun: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    securityPenetrationTestFindingContext: {
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
    findFirst: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
  };
  securityPenetrationTestFindingContext: {
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
    process.env.MACED_API_KEY = 'mc_dev_test_maced_api_key';
  });

  afterAll(() => {
    process.env.MACED_API_KEY = originalMacedApiKey;
    process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL = originalWebhookBase;
    if (originalFetch) {
      global.fetch = originalFetch;
    }
  });

  beforeEach(() => {
    process.env.MACED_API_KEY = 'mc_dev_test_maced_api_key';
    mockPentestCreditsService.getStatus.mockResolvedValue({
      balance: 5,
      totalGranted: 5,
      totalConsumed: 0,
      lastGrantSource: 'trial',
    });
    mockPentestCreditsService.debitOrThrow.mockResolvedValue({
      balance: 4,
      totalGranted: 5,
      totalConsumed: 1,
      lastGrantSource: 'trial',
    });
    mockPentestCreditsService.refund.mockResolvedValue();
    mockPentestCreditsService.writePentestAuditEntry.mockResolvedValue();
    mockBillingEntitlementsService.tryConsumeIncludedUsageForProduct.mockResolvedValue(
      {
        status: 'consumed',
        subscriptionId: 'sub_123',
      },
    );
    mockBillingEntitlementsService.refundIncludedUsageForProduct.mockResolvedValue();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new SecurityPenetrationTestsService(
      mockPentestCreditsService as unknown as PentestCreditsService,
      mockBillingEntitlementsService as unknown as BillingEntitlementsService,
    );
    mockedDb.securityPenetrationTestRun.upsert.mockResolvedValue({});
    mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
      organizationId: 'org_123',
    });
    // findFirst is used three ways. Defaults: not cancelled, no retry child,
    // and the active attempt resolves to the run itself (reflect the root).
    mockedDb.securityPenetrationTestRun.findFirst.mockImplementation(
      (args?: {
        where?: {
          rootRunId?: string;
          retryBlockedAt?: unknown;
          retryOfProviderRunId?: string;
        };
      }) => {
        const where = args?.where ?? {};
        if ('retryBlockedAt' in where) return Promise.resolve(null); // not cancelled
        if ('retryOfProviderRunId' in where) return Promise.resolve(null); // no child
        if (where.rootRunId) {
          return Promise.resolve({
            providerRunId: where.rootRunId,
            attemptNumber: 1,
          });
        }
        return Promise.resolve(null);
      },
    );
    mockedDb.securityPenetrationTestRun.findMany.mockResolvedValue([
      { providerRunId: 'run_123', rootRunId: 'run_123', attemptNumber: 1 },
    ]);
    // Retry idempotency claim succeeds by default.
    mockedDb.securityPenetrationTestRun.updateMany.mockResolvedValue({
      count: 1,
    });
    // Default: no stored finding-context notes for the target.
    mockedDb.securityPenetrationTestFindingContext.findMany.mockResolvedValue(
      [],
    );
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

  async function getRequestBody(
    callIndex = 0,
  ): Promise<Record<string, unknown>> {
    const [input, init] = fetchMock.mock.calls[callIndex];
    if (input instanceof Request) {
      return JSON.parse(await input.clone().text()) as Record<string, unknown>;
    }

    return JSON.parse((init?.body ?? '{}') as string) as Record<
      string,
      unknown
    >;
  }

  function getRequestUrl(callIndex = 0): string {
    const [input] = fetchMock.mock.calls[callIndex];
    return input instanceof Request ? input.url : String(input);
  }

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

    expect(getRequestUrl()).toBe('https://api.maced.ai/v1/pentests');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'run_123',
        status: 'completed',
      }),
    ]);
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
    const requestBody = await getRequestBody();

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
    expect(mockedDb.secret.upsert).not.toHaveBeenCalled();
    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledTimes(1);
  });

  it('omits additionalContext when there is no context to send', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'run_456', status: 'provisioning' }), {
        status: 200,
      }),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
    });

    const requestBody = await getRequestBody();
    expect(requestBody).not.toHaveProperty('additionalContext');
  });

  it('passes user-provided additional context to the provider', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'run_456', status: 'provisioning' }), {
        status: 200,
      }),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      additionalContext: 'We deployed fixes for the auth findings last week.',
    });

    const requestBody = await getRequestBody();
    expect(requestBody.additionalContext).toBe(
      'We deployed fixes for the auth findings last week.',
    );
  });

  it('creates the run even when the notes lookup fails (best-effort context)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'run_456', status: 'provisioning' }), {
        status: 200,
      }),
    );
    // e.g. transient outage, or the table missing mid-deploy before the
    // migration has run — must never block pentest creation.
    mockedDb.securityPenetrationTestFindingContext.findMany.mockRejectedValue(
      new Error('relation does not exist'),
    );

    const result = await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      additionalContext: 'User-typed context.',
    });

    expect(result.id).toBe('run_456');
    const requestBody = await getRequestBody();
    expect(requestBody.additionalContext).toBe('User-typed context.');
  });

  it('appends stored finding-context notes for the normalized target to additionalContext', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'run_456', status: 'provisioning' }), {
        status: 200,
      }),
    );
    mockedDb.securityPenetrationTestFindingContext.findMany.mockResolvedValue([
      {
        issueTitle: 'appConfiguration read access',
        context:
          'Accepted by design — collection holds non-secret bootstrap config.',
      },
      {
        issueTitle: 'Unverified email access',
        context: 'Email verification is now enabled in the tested environment.',
      },
    ]);

    await service.createReport('org_123', {
      // Mixed-case host + trailing slash — the stored-notes lookup must
      // normalize before matching rows keyed by canonical target URL.
      targetUrl: 'https://App.example.com/',
      additionalContext: 'Focus on the three previously reported findings.',
    });

    expect(
      mockedDb.securityPenetrationTestFindingContext.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org_123',
          targetUrl: 'https://app.example.com',
        },
      }),
    );

    const requestBody = await getRequestBody();
    const additionalContext = requestBody.additionalContext as string;
    expect(additionalContext).toContain(
      'Focus on the three previously reported findings.',
    );
    expect(additionalContext).toContain('"appConfiguration read access"');
    expect(additionalContext).toContain(
      'Email verification is now enabled in the tested environment.',
    );
  });

  it('accepts valid scan profile fields in the create DTO', async () => {
    const dto = Object.assign(new CreatePenetrationTestDto(), {
      targetUrl: 'https://app.example.com',
      scanDepth: 'standard',
      evidenceLevel: 'safe_proof',
      checks: ['discovery', 'xss'],
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('forwards scan profile fields to provider when provided', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_profile',
          status: 'provisioning',
        }),
        { status: 200 },
      ),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl: 'https://external-webhook.example.com/callback',
      scanDepth: 'standard',
      evidenceLevel: 'safe_proof',
      checks: ['discovery', 'xss'],
    });
    const requestBody = await getRequestBody();

    expect(requestBody.scanDepth).toBe('standard');
    expect(requestBody.evidenceLevel).toBe('safe_proof');
    expect(requestBody.checks).toEqual(['discovery', 'xss']);
  });

  it('omits scan profile fields when not provided', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_default_profile',
          status: 'provisioning',
        }),
        { status: 200 },
      ),
    );

    await service.createReport('org_123', {
      targetUrl: 'https://app.example.com',
      repoUrl: 'https://github.com/org/repo',
      webhookUrl: 'https://external-webhook.example.com/callback',
    });
    const requestBody = await getRequestBody();

    expect(requestBody.scanDepth).toBeUndefined();
    expect(requestBody.evidenceLevel).toBeUndefined();
    expect(requestBody.checks).toBeUndefined();
  });

  it('maps scan profile fields from provider responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_mapped_profile',
          targetUrl: 'https://app.example.com',
          status: 'completed',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T01:00:00.000Z',
          scanDepth: 'deep',
          evidenceLevel: 'impact_proof',
          checks: ['discovery', 'business_logic'],
        }),
        { status: 200 },
      ),
    );

    await expect(
      service.getReport('org_123', 'run_mapped_profile'),
    ).resolves.toEqual(
      expect.objectContaining({
        scanDepth: 'deep',
        evidenceLevel: 'impact_proof',
        checks: ['discovery', 'business_logic'],
      }),
    );
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
    const requestBody = await getRequestBody();

    expect(requestBody.webhookUrl).toBe(
      'https://api.trycomp.ai/v1/security-penetration-tests/webhook',
    );
  });

  it('creates Comp webhook callback runs without a provider handshake token', async () => {
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
    ).resolves.toEqual(expect.objectContaining({ id: 'run_missing_token' }));

    expect(mockedDb.secret.upsert).not.toHaveBeenCalled();
    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not persist a webhook handshake secret when provider returns one', async () => {
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
    ).resolves.toEqual(expect.objectContaining({ id: 'run_handshake_retry' }));

    expect(mockedDb.secret.upsert).not.toHaveBeenCalled();
    expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledTimes(1);
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
    ).rejects.toThrow('webhookUrl must be a valid absolute URL');
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
    ).rejects.toThrow(HttpException);
  });

  it('maps empty list payload to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(service.listReports('org_123')).rejects.toThrow(HttpException);
  });

  it('maps invalid list payload to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not-json', { status: 200 }));

    await expect(service.listReports('org_123')).rejects.toThrow(HttpException);
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
    const requestBody = await getRequestBody();

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
    const requestBody = await getRequestBody();

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
    const requestBody = await getRequestBody();

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
    const requestBody = await getRequestBody();

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
    const requestBody = await getRequestBody();

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
    const requestBody = await getRequestBody();

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

  // TODO(phase-5): webhook tests removed — handleWebhook now verifies HMAC
  // via @maced/api-client verifyMacedWebhook. Rewrite: valid signature → ok,
  // invalid/missing signature → ForbiddenException, unknown run → warn+ok.
  // Also rewrite the MACED_API_KEY missing test — new behavior throws at
  // service construction, not on first request.

  it('fetches report output as binary payload', async () => {
    const fixtureContent = 'markdown report body';

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
      new Response(JSON.stringify({ markdown: fixtureContent }), {
        status: 200,
      }),
    );

    const output = await service.getReportOutput('org_123', 'run_output');

    expect(getRequestUrl(1)).toBe(
      'https://api.maced.ai/v1/pentests/run_output/report',
    );
    expect(output.buffer).toEqual(Buffer.from(fixtureContent, 'utf-8'));
    expect(output.contentType).toBe('text/markdown; charset=utf-8');
  });

  it('appends customer context notes to the markdown report', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_notes',
          targetUrl: 'https://app.example.com',
          status: 'completed',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ markdown: '# Report\n\nBody.' }), {
        status: 200,
      }),
    );
    mockedDb.securityPenetrationTestFindingContext.findMany.mockResolvedValue([
      {
        issueTitle: 'appConfiguration read access',
        context: 'Accepted by design.',
        updatedAt: new Date('2026-06-11T00:00:00.000Z'),
      },
    ]);

    const output = await service.getReportOutput('org_123', 'run_notes');
    const markdown = output.buffer.toString('utf-8');

    expect(markdown.startsWith('# Report\n\nBody.')).toBe(true);
    expect(markdown).toContain(
      '## Appendix: Customer context & management responses',
    );
    expect(markdown).toContain('Accepted by design.');
  });

  it('serves the original report when the notes lookup fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_notes_err',
          targetUrl: 'https://app.example.com',
          status: 'completed',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ markdown: '# Report' }), { status: 200 }),
    );
    mockedDb.securityPenetrationTestFindingContext.findMany.mockRejectedValue(
      new Error('db unavailable'),
    );

    const output = await service.getReportOutput('org_123', 'run_notes_err');

    expect(output.buffer.toString('utf-8')).toBe('# Report');
  });

  it('serves the original PDF bytes when the provider PDF cannot be parsed', async () => {
    const bogusPdf = Buffer.from('definitely not a pdf');
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_pdf_bogus',
          targetUrl: 'https://app.example.com',
          status: 'completed',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(bogusPdf, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    mockedDb.securityPenetrationTestFindingContext.findMany.mockResolvedValue([
      {
        issueTitle: 'Some finding',
        context: 'Some note.',
        updatedAt: new Date('2026-06-11T00:00:00.000Z'),
      },
    ]);

    const output = await service.getReportPdf('org_123', 'run_pdf_bogus');

    expect(output.buffer).toEqual(bogusPdf);
    expect(output.contentType).toBe('application/pdf');
  });

  it('appends appendix pages to the PDF report when notes exist', async () => {
    const baseDoc = await PDFDocument.create();
    baseDoc.addPage([595, 842]);
    const basePdf = Buffer.from(await baseDoc.save());

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'run_pdf_notes',
          targetUrl: 'https://app.example.com',
          status: 'completed',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        }),
        { status: 200 },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(basePdf, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    mockedDb.securityPenetrationTestFindingContext.findMany.mockResolvedValue([
      {
        issueTitle: 'appConfiguration read access',
        context: 'Accepted by design.',
        updatedAt: new Date('2026-06-11T00:00:00.000Z'),
      },
    ]);

    const output = await service.getReportPdf('org_123', 'run_pdf_notes');

    const merged = await PDFDocument.load(output.buffer);
    expect(merged.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it('falls back to markdown content type when response omits content-type', async () => {
    const fixtureContent = 'raw report';

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
      new Response(JSON.stringify({ markdown: fixtureContent }), {
        status: 200,
      }),
    );

    const output = await service.getReportOutput(
      'org_123',
      'run_output_no_type',
    );

    expect(output.contentType).toBe('text/markdown; charset=utf-8');
    expect(output.contentDisposition).toBeNull();
    expect(output.buffer).toEqual(Buffer.from(fixtureContent, 'utf-8'));
  });

  it('gets report data by id', async () => {
    const fixtureReport = { id: 'run_123', status: 'completed' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(fixtureReport), { status: 200 }),
    );

    const report = await service.getReport('org_123', 'run_123');

    expect(getRequestUrl()).toBe('https://api.maced.ai/v1/pentests/run_123');
    expect(report).toEqual(
      expect.objectContaining({
        id: 'run_123',
        status: 'completed',
      }),
    );
  });

  it('maps invalid get report response to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('invalid-json', { status: 200 }),
    );

    await expect(service.getReport('org_123', 'run_123')).rejects.toThrow(
      HttpException,
    );
  });

  it('maps empty get report response to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(service.getReport('org_123', 'run_123')).rejects.toThrow(
      HttpException,
    );
  });

  it('maps empty get progress response to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(
      service.getReportProgress('org_123', 'run_123'),
    ).rejects.toThrow(HttpException);
  });

  it('maps invalid report progress payload to bad gateway', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 200 }));

    await expect(
      service.getReportProgress('org_123', 'run_123'),
    ).rejects.toThrow(HttpException);
  });

  it('throws a mapped HttpException for failed provider calls', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"server error"}', {
        status: HttpStatus.BAD_REQUEST,
      }),
    );

    await expect(service.getReport('org_123', 'missing')).rejects.toThrow(
      HttpException,
    );
  });

  describe('auto-retry lineage', () => {
    it('persists self-root lineage for an original run', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'run_orig', status: 'provisioning' }),
          { status: 200 },
        ),
      );

      await service.createReport('org_123', {
        targetUrl: 'https://app.example.com',
        scanDepth: 'deep',
        checks: ['xss'],
      });

      expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            providerRunId: 'run_orig',
            rootRunId: 'run_orig',
            attemptNumber: 1,
            retryOfProviderRunId: null,
            scanParams: expect.objectContaining({
              targetUrl: 'https://app.example.com',
              scanDepth: 'deep',
              checks: ['xss'],
            }),
          }),
        }),
      );
    });

    it('persists inherited lineage for a retry run', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'run_retry', status: 'provisioning' }),
          { status: 200 },
        ),
      );

      await service.createReport(
        'org_123',
        { targetUrl: 'https://app.example.com' },
        {
          attemptNumber: 2,
          rootRunId: 'run_orig',
          retryOfProviderRunId: 'run_orig',
        },
      );

      expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            providerRunId: 'run_retry',
            rootRunId: 'run_orig',
            attemptNumber: 2,
            retryOfProviderRunId: 'run_orig',
          }),
        }),
      );
    });

    it('spawns a retry with the same params (incl. pipeline + context) and incremented attempt', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce({
        organizationId: 'org_123',
        attemptNumber: 1,
        rootRunId: 'run_orig',
        scanParams: {
          targetUrl: 'https://app.example.com',
          scanDepth: 'deep',
          checks: ['xss'],
          pipelineTesting: true,
          additionalContext: 'prior briefing',
        },
      });
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'run_retry', status: 'provisioning' }),
          { status: 200 },
        ),
      );

      await service['maybeAutoRetry']('run_orig');

      const createBody = await getRequestBody();
      expect(createBody).toEqual(
        expect.objectContaining({
          targetUrl: 'https://app.example.com',
          scanDepth: 'deep',
          checks: ['xss'],
          pipelineTesting: true,
        }),
      );
      // The user's briefing survives the round-trip (re-persisted for any
      // further retry).
      expect(mockedDb.securityPenetrationTestRun.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            providerRunId: 'run_retry',
            rootRunId: 'run_orig',
            attemptNumber: 2,
            retryOfProviderRunId: 'run_orig',
            scanParams: expect.objectContaining({
              pipelineTesting: true,
              additionalContext: 'prior briefing',
            }),
          }),
        }),
      );
    });

    it('blocks auto-retry across the whole lineage when a run is cancelled', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce({
        rootRunId: 'run_orig',
      });

      await service['blockAutoRetry']('run_cancelled');

      // Sets the distinct cancellation marker on every attempt sharing the
      // lineage root, so a late `failed` for any member can't restart it.
      expect(
        mockedDb.securityPenetrationTestRun.updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { rootRunId: 'run_orig', retryBlockedAt: null },
          data: expect.objectContaining({ retryBlockedAt: expect.any(Date) }),
        }),
      );
    });

    it('propagates a DB failure while blocking so the cancellation redelivers', async () => {
      mockedDb.securityPenetrationTestRun.updateMany.mockRejectedValueOnce(
        new Error('db unavailable'),
      );

      // Rethrows (not swallowed) so the webhook 5xx's and Maced redelivers the
      // cancellation until the block is durably stored.
      await expect(
        service['blockAutoRetry']('run_cancelled'),
      ).rejects.toThrow();
    });

    it('does not retry a cancelled lineage even if a late failed arrives', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce({
        organizationId: 'org_123',
        attemptNumber: 1,
        rootRunId: 'run_orig',
        scanParams: { targetUrl: 'https://app.example.com' },
      });
      // Block check (first findFirst) reports the lineage is cancelled.
      mockedDb.securityPenetrationTestRun.findFirst.mockResolvedValueOnce({
        providerRunId: 'run_orig',
      });

      await service['maybeAutoRetry']('run_orig');

      expect(mockedDb.securityPenetrationTestRun.upsert).not.toHaveBeenCalled();
    });

    it('does not retry when a retry child already exists (idempotent)', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce({
        organizationId: 'org_123',
        attemptNumber: 1,
        rootRunId: 'run_orig',
        scanParams: { targetUrl: 'https://app.example.com' },
      });
      // Block check → not cancelled; child check → a child already exists.
      mockedDb.securityPenetrationTestRun.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ providerRunId: 'run_retry' });

      await service['maybeAutoRetry']('run_orig');

      expect(mockedDb.securityPenetrationTestRun.upsert).not.toHaveBeenCalled();
    });

    it('does not retry once the lineage is exhausted', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce({
        organizationId: 'org_123',
        attemptNumber: 3,
        rootRunId: 'run_orig',
        scanParams: { targetUrl: 'https://app.example.com' },
      });

      await service['maybeAutoRetry']('run_orig');

      expect(
        mockedDb.securityPenetrationTestRun.updateMany,
      ).not.toHaveBeenCalled();
      expect(mockedDb.securityPenetrationTestRun.upsert).not.toHaveBeenCalled();
    });

    it('does not retry an orphan run with no ownership row', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce(
        null,
      );

      await service['maybeAutoRetry']('run_ghost');

      expect(
        mockedDb.securityPenetrationTestRun.updateMany,
      ).not.toHaveBeenCalled();
      expect(mockedDb.securityPenetrationTestRun.upsert).not.toHaveBeenCalled();
    });

    it('rethrows when the retry spawn fails so the webhook redelivers (durable via child-existence)', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValueOnce({
        organizationId: 'org_123',
        attemptNumber: 1,
        rootRunId: 'run_orig',
        scanParams: { targetUrl: 'https://app.example.com' },
      });
      fetchMock.mockResolvedValueOnce(
        new Response('{"error":"boom"}', { status: 500 }),
      );

      // No child is created, so it rethrows → webhook 5xx → Maced redelivers →
      // next delivery sees no child and re-attempts. Nothing to release.
      await expect(service['maybeAutoRetry']('run_orig')).rejects.toThrow();
    });

    it('collapses a retry lineage to a single active-attempt entry', async () => {
      mockedDb.securityPenetrationTestRun.findMany.mockResolvedValueOnce([
        { providerRunId: 'run_orig', rootRunId: 'run_orig', attemptNumber: 1 },
        { providerRunId: 'run_retry', rootRunId: 'run_orig', attemptNumber: 2 },
      ]);
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'run_orig',
              status: 'failed',
              targetUrl: 'https://a.com',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              error: 'Sandbox container deleted by Daytona',
            },
            {
              id: 'run_retry',
              status: 'running',
              targetUrl: 'https://a.com',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:05:00.000Z',
            },
          ]),
          { status: 200 },
        ),
      );

      const result = await service.listReports('org_123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: 'run_orig', status: 'running' }),
      );
    });

    it('masks a fresh failed non-final attempt as in-progress', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
        organizationId: 'org_123',
        rootRunId: 'run_orig',
      });
      mockedDb.securityPenetrationTestRun.findFirst.mockResolvedValueOnce({
        providerRunId: 'run_orig',
        attemptNumber: 1,
      });
      const recent = new Date().toISOString();
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'run_orig',
            status: 'failed',
            targetUrl: 'https://a.com',
            createdAt: recent,
            updatedAt: recent,
            error: 'Sandbox container deleted by Daytona',
          }),
          { status: 200 },
        ),
      );

      const report = await service.getReport('org_123', 'run_orig');

      expect(report.status).toBe('provisioning');
      expect(report.error).toBeNull();
      expect(report.failedReason).toBeNull();
    });

    it('reveals a clean, white-labeled failure once the lineage is exhausted', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
        organizationId: 'org_123',
        rootRunId: 'run_orig',
      });
      mockedDb.securityPenetrationTestRun.findFirst.mockResolvedValueOnce({
        providerRunId: 'run_retry2',
        attemptNumber: 3,
      });
      const recent = new Date().toISOString();
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'run_retry2',
            status: 'failed',
            targetUrl: 'https://a.com',
            createdAt: recent,
            updatedAt: recent,
            error:
              'Sandbox container deleted by Daytona infrastructure — backup/restore race condition',
          }),
          { status: 200 },
        ),
      );

      const report = await service.getReport('org_123', 'run_orig');

      expect(report.status).toBe('failed');
      expect(report.id).toBe('run_orig');
      expect(report.failedReason).toContain('temporary infrastructure issue');
      expect(report.failedReason?.toLowerCase()).not.toContain('daytona');
      expect(report.error?.toLowerCase()).not.toContain('daytona');
    });

    it('masks progress status as in-progress for a failed non-final attempt', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
        organizationId: 'org_123',
        rootRunId: 'run_orig',
      });
      const recent = new Date().toISOString();
      // getReportResolved.get() then progress() — two provider calls.
      fetchMock
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'run_orig',
              status: 'failed',
              targetUrl: 'https://a.com',
              createdAt: recent,
              updatedAt: recent,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              status: 'failed',
              completedAgents: 2,
              totalAgents: 5,
              elapsedMs: 1000,
            }),
            { status: 200 },
          ),
        );

      const progress = await service.getReportProgress('org_123', 'run_orig');

      expect(progress.status).toBe('provisioning');
    });

    it('exposes failed progress once the lineage is exhausted', async () => {
      mockedDb.securityPenetrationTestRun.findUnique.mockResolvedValue({
        organizationId: 'org_123',
        rootRunId: 'run_orig',
      });
      mockedDb.securityPenetrationTestRun.findFirst.mockResolvedValueOnce({
        providerRunId: 'run_retry2',
        attemptNumber: 3,
      });
      const recent = new Date().toISOString();
      fetchMock
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: 'run_retry2',
              status: 'failed',
              targetUrl: 'https://a.com',
              createdAt: recent,
              updatedAt: recent,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              status: 'failed',
              completedAgents: 2,
              totalAgents: 5,
              elapsedMs: 1000,
            }),
            { status: 200 },
          ),
        );

      const progress = await service.getReportProgress('org_123', 'run_orig');

      expect(progress.status).toBe('failed');
    });
  });
});

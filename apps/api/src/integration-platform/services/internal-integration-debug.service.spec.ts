jest.mock('@db', () => ({
  db: {
    integrationConnection: { findMany: jest.fn(), findUnique: jest.fn() },
    integrationCredentialVersion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    integrationCheckRun: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    integrationOAuthError: { findMany: jest.fn() },
    dynamicIntegration: { findFirst: jest.fn() },
    task: { findUnique: jest.fn(), updateMany: jest.fn() },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { InternalIntegrationDebugService } from './internal-integration-debug.service';
import type { ConnectionCheckRunnerService } from './connection-check-runner.service';
import type { CheckRunRepository } from '../repositories/check-run.repository';
import type { DynamicManifestLoaderService } from './dynamic-manifest-loader.service';

const encryptedBlob = {
  encrypted: 'Y2lwaGVydGV4dA==',
  iv: 'aXY=',
  tag: 'dGFn',
  salt: 'c2FsdA==',
};

const mockedDb = db as unknown as {
  integrationConnection: { findMany: jest.Mock; findUnique: jest.Mock };
  integrationCredentialVersion: { findUnique: jest.Mock; findMany: jest.Mock };
  integrationCheckRun: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    groupBy: jest.Mock;
  };
  integrationOAuthError: { findMany: jest.Mock };
  dynamicIntegration: { findFirst: jest.Mock };
  task: { findUnique: jest.Mock; updateMany: jest.Mock };
};

const makeService = (
  runner: Partial<ConnectionCheckRunnerService> = {},
  checkRunRepo: Partial<CheckRunRepository> = {},
  manifestLoader: Partial<DynamicManifestLoaderService> = {
    loadDynamicManifests: jest.fn().mockResolvedValue(undefined),
  },
) =>
  new InternalIntegrationDebugService(
    runner as ConnectionCheckRunnerService,
    checkRunRepo as CheckRunRepository,
    manifestLoader as DynamicManifestLoaderService,
  );

describe('InternalIntegrationDebugService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('credential metadata (never leaks secrets)', () => {
    it('masks encrypted blobs and secret-named fields, exposes only non-secret routing values', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_1',
          organizationId: 'org_1',
          provider: { slug: 'zoho-crm', name: 'Zoho CRM' },
          status: 'active',
          errorMessage: null,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          variables: null,
          activeCredentialVersionId: 'icv_1',
        },
      ]);
      mockedDb.integrationCredentialVersion.findMany.mockResolvedValue([
        {
          id: 'icv_1',
          version: 14,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date(Date.now() + 3_600_000),
          encryptedPayload: {
            access_token: encryptedBlob,
            refresh_token: encryptedBlob,
            client_secret: 'should-be-masked-even-though-plaintext',
            api_domain: 'https://www.zohoapis.eu',
            scope: 'ZohoCRM.users.READ',
            region: 'us2.ninjarmm.com',
            token_type: 'Bearer',
          },
        },
      ]);
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([]);

      const service = makeService();
      const { connections } = await service.listConnections({
        organizationId: 'org_1',
      });
      const fields = connections[0].credential!.fields as Record<
        string,
        Record<string, unknown>
      >;

      // Secrets: never a raw value.
      expect(fields.access_token).toEqual({ present: true, encrypted: true });
      expect(fields.refresh_token).toEqual({ present: true, encrypted: true });
      // Plaintext but secret-named → masked, not exposed.
      expect(fields.client_secret).toEqual({ present: true, masked: true });
      expect(fields.client_secret).not.toHaveProperty('value');
      // Non-secret routing fields → exposed for debugging.
      expect(fields.api_domain).toEqual({
        present: true,
        value: 'https://www.zohoapis.eu',
      });
      expect(fields.scope).toEqual({
        present: true,
        value: 'ZohoCRM.users.READ',
      });
      expect(fields.region).toEqual({
        present: true,
        value: 'us2.ninjarmm.com',
      });

      // Absolutely no plaintext secret value anywhere in the response.
      expect(JSON.stringify(connections)).not.toContain('should-be-masked');
      expect(connections[0].credential!.expired).toBe(false);
    });

    it('flags an expired credential version', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_2',
          organizationId: 'org_1',
          provider: { slug: 'zoho-crm', name: 'Zoho CRM' },
          status: 'active',
          errorMessage: null,
          updatedAt: new Date(),
          variables: null,
          activeCredentialVersionId: 'icv_2',
        },
      ]);
      mockedDb.integrationCredentialVersion.findMany.mockResolvedValue([
        {
          id: 'icv_2',
          version: 1,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: new Date(Date.now() - 1_000),
          encryptedPayload: { access_token: encryptedBlob },
        },
      ]);
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([]);

      const service = makeService();
      const { connections } = await service.listConnections({});
      expect(connections[0].credential!.expired).toBe(true);
    });

    it('returns null credential when the connection has no active version', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_3',
          organizationId: 'org_1',
          provider: { slug: 'x', name: 'X' },
          status: 'pending',
          errorMessage: null,
          updatedAt: new Date(),
          variables: null,
          activeCredentialVersionId: null,
        },
      ]);
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([]);

      const service = makeService();
      const { connections } = await service.listConnections({});
      expect(connections[0].credential).toBeNull();
      // No active version id → we never query credential versions at all.
      expect(
        mockedDb.integrationCredentialVersion.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('listConnections input guards + batching', () => {
    it('tolerates a non-numeric limit (no NaN to the DB) and maps the latest run per connection', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_a',
          organizationId: 'org_1',
          provider: { slug: 'zoho-crm', name: 'Zoho CRM' },
          status: 'active',
          errorMessage: null,
          updatedAt: new Date(),
          variables: null,
          activeCredentialVersionId: null,
        },
      ]);
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([
        {
          id: 'run_1',
          connectionId: 'icn_a',
          checkId: 'c',
          status: 'failed',
          passedCount: 0,
          failedCount: 1,
          completedAt: new Date(),
          errorMessage: 'boom',
        },
      ]);

      const service = makeService();
      const { connections } = await service.listConnections({
        limit: Number('not-a-number'),
      });

      expect(connections[0].latestRun).toMatchObject({
        id: 'run_1',
        status: 'failed',
      });
      // The NaN limit must be normalized before it reaches Prisma's `take`.
      const take =
        mockedDb.integrationConnection.findMany.mock.calls[0][0].take;
      expect(Number.isFinite(take)).toBe(true);
    });
  });

  describe('runConnectionChecks', () => {
    it('resolves the org from the connection and delegates to the runner (no persistence)', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_42',
      });
      const runChecks = jest.fn().mockResolvedValue({
        results: [],
        totalFindings: 0,
        totalPassing: 0,
        durationMs: 5,
      });
      const service = makeService({ runChecks });

      const result = await service.runConnectionChecks({
        connectionId: 'icn_9',
        checkId: 'zoho_crm_employee_access',
      });

      expect(runChecks).toHaveBeenCalledWith({
        connectionId: 'icn_9',
        organizationId: 'org_42',
        checkId: 'zoho_crm_employee_access',
      });
      expect(result.totalFindings).toBe(0);
    });

    it('throws NotFound when the connection does not exist', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue(null);
      const runChecks = jest.fn();
      const service = makeService({ runChecks });

      await expect(
        service.runConnectionChecks({ connectionId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(runChecks).not.toHaveBeenCalled();
    });
  });

  describe('testCandidateCode', () => {
    it('resolves the org and delegates candidate code to the runner (no persistence, no live edit)', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_42',
      });
      const runCandidateCheck = jest.fn().mockResolvedValue({
        results: [
          {
            checkId: 'candidate',
            result: {
              findings: [],
              passingResults: [{ title: 'ok' }],
              logs: [],
            },
          },
        ],
        totalFindings: 0,
        totalPassing: 1,
        durationMs: 7,
      });
      const service = makeService({ runCandidateCheck });

      const result = await service.testCandidateCode({
        connectionId: 'icn_9',
        code: 'ctx.pass({ title: "ok", resourceType: "app", resourceId: "x" });',
        checkId: 'zoho_crm_employee_access',
      });

      expect(runCandidateCheck).toHaveBeenCalledWith({
        connectionId: 'icn_9',
        organizationId: 'org_42',
        code: 'ctx.pass({ title: "ok", resourceType: "app", resourceId: "x" });',
        checkId: 'zoho_crm_employee_access',
      });
      expect(result.totalPassing).toBe(1);
    });

    it('throws NotFound when the connection does not exist', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue(null);
      const runCandidateCheck = jest.fn();
      const service = makeService({ runCandidateCheck });

      await expect(
        service.testCandidateCode({ connectionId: 'missing', code: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(runCandidateCheck).not.toHaveBeenCalled();
    });
  });

  describe('listOAuthErrors', () => {
    it('filters by org + provider and clamps a non-numeric limit', async () => {
      mockedDb.integrationOAuthError.findMany.mockResolvedValue([
        {
          id: 'ioe_1',
          organizationId: 'org_1',
          providerSlug: 'quickbooks-online',
          errorCode: 'token_exchange_failed',
          errorDescription: 'sandbox',
          createdAt: new Date(),
        },
      ]);
      const service = makeService();

      const { errors, total } = await service.listOAuthErrors({
        organizationId: 'org_1',
        providerSlug: 'quickbooks-online',
        limit: Number('nope'),
      });

      expect(total).toBe(1);
      expect(errors[0].errorCode).toBe('token_exchange_failed');
      const args = mockedDb.integrationOAuthError.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        organizationId: 'org_1',
        providerSlug: 'quickbooks-online',
      });
      expect(Number.isFinite(args.take)).toBe(true);
    });
  });

  describe('listInconclusiveRuns (self-heal work queue)', () => {
    it('queries only inconclusive runs, filtered by provider, newest first', async () => {
      const completedAt = new Date();
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([
        {
          id: 'icr_1',
          checkId: 'neon_app_availability',
          checkName: 'App Availability',
          status: 'inconclusive',
          completedAt,
          connection: {
            id: 'icn_1',
            organizationId: 'org_1',
            provider: { slug: 'neon', name: 'Neon' },
          },
          results: [
            {
              resourceId: 'neon',
              resourceType: 'platform',
              title: 'x',
              description: 'y',
              evidence: { error: 'http_404' },
            },
          ],
        },
      ]);
      // Latest run for this (conn, check) IS the inconclusive one → kept.
      mockedDb.integrationCheckRun.groupBy.mockResolvedValue([
        {
          connectionId: 'icn_1',
          checkId: 'neon_app_availability',
          _max: { completedAt },
        },
      ]);

      const service = makeService();
      const { runs, total } = await service.listInconclusiveRuns({
        providerSlug: 'neon',
        limit: 10,
      });

      expect(total).toBe(1);
      expect(runs[0].status).toBe('inconclusive');
      const args = mockedDb.integrationCheckRun.findMany.mock.calls[0][0];
      expect(args.where.status).toBe('inconclusive');
      expect(args.where.connection.provider).toEqual({ slug: 'neon' });
      expect(args.orderBy).toEqual({ completedAt: 'desc' });
      expect(args.take).toBe(10);
      // Nested failing results are BOUNDED so a check with thousands of findings
      // can't dump an unbounded payload to the agent poller.
      expect(args.select.results.take).toBe(20);
    });

    it('drops a stale inconclusive run when a newer run superseded it', async () => {
      const stale = new Date('2026-06-01T00:00:00Z');
      const newer = new Date('2026-06-02T00:00:00Z');
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([
        {
          id: 'icr_old',
          checkId: 'neon_app_availability',
          checkName: 'App Availability',
          status: 'inconclusive',
          completedAt: stale,
          connection: {
            id: 'icn_1',
            organizationId: 'org_1',
            provider: { slug: 'neon', name: 'Neon' },
          },
          results: [],
        },
      ]);
      // A newer run (e.g. a success after we fixed it) exists for the same pair.
      mockedDb.integrationCheckRun.groupBy.mockResolvedValue([
        {
          connectionId: 'icn_1',
          checkId: 'neon_app_availability',
          _max: { completedAt: newer },
        },
      ]);

      const service = makeService();
      const { runs, total } = await service.listInconclusiveRuns({
        providerSlug: 'neon',
        limit: 10,
      });

      expect(total).toBe(0);
      expect(runs).toHaveLength(0);
    });

    it('returns empty without a groupBy query when nothing is held', async () => {
      mockedDb.integrationCheckRun.findMany.mockResolvedValue([]);

      const service = makeService();
      const { runs, total } = await service.listInconclusiveRuns({ limit: 10 });

      expect(total).toBe(0);
      expect(runs).toHaveLength(0);
      expect(mockedDb.integrationCheckRun.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('rerunAndPersistCheck (self-heal re-run + persist)', () => {
    const runResult = (status: string, findings: unknown[] = []) => ({
      results: [
        {
          checkId: 'neon_x',
          checkName: 'Neon X',
          status,
          durationMs: 5,
          error: undefined,
          result: {
            findings,
            passingResults:
              status === 'success'
                ? [
                    {
                      resourceType: 't',
                      resourceId: 'r',
                      title: 'ok',
                      description: 'ok',
                    },
                  ]
                : [],
            summary: { totalChecked: 1 },
            logs: [],
          },
        },
      ],
    });

    const makeRepo = () => ({
      create: jest.fn().mockResolvedValue({ id: 'icr_new' }),
      addResults: jest.fn().mockResolvedValue({}),
      complete: jest.fn().mockResolvedValue({}),
    });

    beforeEach(() => {
      // The persisted re-run validates the taskId belongs to the connection's org
      // (assertTaskBelongsToOrg). Default the task to the same org as the tests.
      mockedDb.task.findUnique.mockResolvedValue({ organizationId: 'org_1' });
    });

    it('persists a fresh SUCCESS run when the fixed check now passes', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_1',
        provider: { slug: 'neon' },
      });
      mockedDb.dynamicIntegration.findFirst.mockResolvedValue({
        id: 'din_neon',
      });
      const runChecks = jest.fn().mockResolvedValue(runResult('success'));
      const repo = makeRepo();

      const service = makeService({ runChecks }, repo);
      const out = await service.rerunAndPersistCheck({
        connectionId: 'icn_1',
        checkId: 'neon_x',
        taskId: 'task_1',
      });

      expect(out.status).toBe('success');
      expect(repo.complete).toHaveBeenCalledWith(
        'icr_new',
        expect.objectContaining({ status: 'success' }),
      );
    });

    it('re-holds as INCONCLUSIVE when the check still fails our-side (404)', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_1',
        provider: { slug: 'neon' },
      });
      mockedDb.dynamicIntegration.findFirst.mockResolvedValue({
        id: 'din_neon',
      });
      const runChecks = jest.fn().mockResolvedValue(
        runResult('failed', [
          {
            resourceType: 'platform',
            resourceId: 'neon',
            title: 'unhealthy',
            description: '404',
            evidence: { error: 'http_404' },
          },
        ]),
      );
      const repo = makeRepo();

      const service = makeService({ runChecks }, repo);
      const out = await service.rerunAndPersistCheck({
        connectionId: 'icn_1',
        checkId: 'neon_x',
        taskId: 'task_1',
      });

      expect(out.status).toBe('inconclusive');
      expect(repo.complete).toHaveBeenCalledWith(
        'icr_new',
        expect.objectContaining({ status: 'inconclusive', failedCount: 0 }),
      );
    });

    it('refreshes the manifest cache BEFORE running (so a just-patched fix is live, not the 60s-stale code)', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_1',
        provider: { slug: 'neon' },
      });
      mockedDb.dynamicIntegration.findFirst.mockResolvedValue({ id: 'din_neon' });
      const runChecks = jest.fn().mockResolvedValue(runResult('success'));
      const loadDynamicManifests = jest.fn().mockResolvedValue(undefined);

      const service = makeService({ runChecks }, makeRepo(), {
        loadDynamicManifests,
      });
      await service.rerunAndPersistCheck({
        connectionId: 'icn_1',
        checkId: 'neon_x',
        taskId: 'task_1',
      });

      expect(loadDynamicManifests).toHaveBeenCalledTimes(1);
      // Refresh MUST happen before the run — otherwise the run executes stale code.
      expect(loadDynamicManifests.mock.invocationCallOrder[0]).toBeLessThan(
        runChecks.mock.invocationCallOrder[0],
      );
    });

    it('still runs (falls back to cached manifests) when the refresh throws', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_1',
        provider: { slug: 'neon' },
      });
      mockedDb.dynamicIntegration.findFirst.mockResolvedValue({ id: 'din_neon' });
      const runChecks = jest.fn().mockResolvedValue(runResult('success'));
      const loadDynamicManifests = jest
        .fn()
        .mockRejectedValue(new Error('db blip'));

      const service = makeService({ runChecks }, makeRepo(), {
        loadDynamicManifests,
      });
      const out = await service.rerunAndPersistCheck({
        connectionId: 'icn_1',
        checkId: 'neon_x',
        taskId: 'task_1',
      });

      // Refresh failure is swallowed; the re-run still executes + persists.
      expect(out.status).toBe('success');
      expect(runChecks).toHaveBeenCalledTimes(1);
    });
  });
});

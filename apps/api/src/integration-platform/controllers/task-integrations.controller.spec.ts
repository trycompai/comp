import { Test, TestingModule } from '@nestjs/testing';
import { TaskIntegrationsController } from './task-integrations.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { TaskIntegrationChecksService } from '../services/task-integration-checks.service';

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { integration: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@db', () => ({
  db: {
    task: { findUnique: jest.fn(), update: jest.fn() },
    findingException: { findMany: jest.fn() },
    // Self-heal hold gates on whether the provider is a dynamic integration.
    // Default (undefined → not dynamic) keeps these static-manifest tests on
    // their existing path.
    dynamicIntegration: { findFirst: jest.fn() },
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
  getActiveManifests: jest.fn(),
  runAllChecks: jest.fn(),
  // Default: not a code manifest, so isDynamic falls through to the
  // dynamicIntegration lookup (the pre-guard behavior these tests rely on).
  // A code-manifest case is exercised explicitly below.
  isCodeManifest: jest.fn(() => false),
}));

import { db } from '@db';
import {
  getManifest,
  isCodeManifest,
  runAllChecks,
} from '@trycompai/integration-platform';

const mockedGetManifest = getManifest as jest.Mock;
const mockedRunAllChecks = runAllChecks as jest.Mock;
const mockedIsCodeManifest = isCodeManifest as jest.Mock;
// Grab through the module reference to avoid the `unbound-method` lint rule.
const mockedTask = db.task as unknown as {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const mockTaskFindUnique = mockedTask.findUnique;
const mockTaskUpdate = mockedTask.update;
const mockFindingExceptionFindMany = (
  db as unknown as { findingException: { findMany: jest.Mock } }
).findingException.findMany;
const mockDynamicIntegrationFindFirst = (
  db as unknown as { dynamicIntegration: { findFirst: jest.Mock } }
).dynamicIntegration.findFirst;

const MANIFEST = {
  id: 'aws',
  name: 'Amazon Web Services',
  auth: { type: 'custom' },
  checks: [
    { id: 'aws-s3-encryption', name: 'S3 — default encryption enabled' },
  ],
};

const VALID_CREDS = {
  roleArn: 'arn:aws:iam::111111111111:role/x',
  externalId: 'ext',
  regions: ['us-east-1'],
};

function passingResult() {
  return {
    results: [
      {
        checkId: 'aws-s3-encryption',
        checkName: 'S3 — default encryption enabled',
        status: 'success',
        durationMs: 10,
        error: undefined,
        result: {
          findings: [],
          passingResults: [
            {
              resourceType: 'aws-s3-bucket',
              resourceId: 'b1',
              title: 'ok',
              description: 'ok',
            },
          ],
          summary: { totalChecked: 1 },
          logs: [],
        },
      },
    ],
  };
}

function failingResult() {
  return {
    results: [
      {
        checkId: 'aws-s3-encryption',
        checkName: 'S3 — default encryption enabled',
        status: 'failed',
        durationMs: 10,
        error: undefined,
        result: {
          findings: [
            {
              resourceType: 'aws-s3-bucket',
              resourceId: 'b2',
              title: 'no enc',
              description: 'x',
              severity: 'high',
              remediation: 'fix',
            },
          ],
          passingResults: [],
          summary: { totalChecked: 1 },
          logs: [],
        },
      },
    ],
  };
}

// A check that "failed" for an OUR-SIDE reason (the finding's evidence carries an
// http_404), as the self-heal layer should hold rather than show.
function ourSideFailingResult() {
  return {
    results: [
      {
        checkId: 'aws-s3-encryption',
        checkName: 'S3 — default encryption enabled',
        status: 'failed',
        durationMs: 10,
        error: undefined,
        result: {
          findings: [
            {
              resourceType: 'platform',
              resourceId: 'neon',
              title: 'endpoint unhealthy',
              description: '/projects returned HTTP 404',
              severity: 'high',
              remediation: 'x',
              evidence: {
                error: 'http_404',
                message: '/projects returned HTTP 404',
              },
            },
          ],
          passingResults: [],
          summary: { totalChecked: 1 },
          logs: [],
        },
      },
    ],
  };
}

// One passing bucket (b1) + one failing finding (b2) — mirrors the real
// customer case (e.g. 18 pass, 1 fails) used to test exception handling.
function mixedResult() {
  return {
    results: [
      {
        checkId: 'aws-s3-encryption',
        checkName: 'S3 — default encryption enabled',
        status: 'failed',
        durationMs: 10,
        error: undefined,
        result: {
          findings: [
            {
              resourceType: 'aws-s3-bucket',
              resourceId: 'b2',
              title: 'no enc',
              description: 'x',
              severity: 'high',
              remediation: 'fix',
            },
          ],
          passingResults: [
            {
              resourceType: 'aws-s3-bucket',
              resourceId: 'b1',
              title: 'ok',
              description: 'ok',
            },
          ],
          summary: { totalChecked: 2 },
          logs: [],
        },
      },
    ],
  };
}

describe('TaskIntegrationsController', () => {
  let controller: TaskIntegrationsController;

  const mockConnectionRepository = {
    findById: jest.fn(),
    findActiveByProviderAndOrg: jest.fn(),
  };
  const mockProviderRepository = { findById: jest.fn() };
  const mockCheckRunRepository = {
    create: jest.fn(),
    complete: jest.fn(),
    addResults: jest.fn(),
    findLatestPerConnectionAndCheckByTask: jest.fn(),
    findLastAttemptPerConnectionAndCheckByTask: jest.fn(),
    countExceptedFailures: jest.fn(),
  };
  const mockCredentialVaultService = { getDecryptedCredentials: jest.fn() };
  const mockOAuthCredentialsService = {
    getCredentials: jest.fn(),
    checkAvailability: jest.fn(),
  };
  const mockTaskIntegrationChecksService = {
    disconnectCheckFromTask: jest.fn(),
    reconnectCheckToTask: jest.fn(),
  };
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskIntegrationsController],
      providers: [
        { provide: ConnectionRepository, useValue: mockConnectionRepository },
        { provide: ProviderRepository, useValue: mockProviderRepository },
        { provide: CheckRunRepository, useValue: mockCheckRunRepository },
        {
          provide: CredentialVaultService,
          useValue: mockCredentialVaultService,
        },
        {
          provide: OAuthCredentialsService,
          useValue: mockOAuthCredentialsService,
        },
        {
          provide: TaskIntegrationChecksService,
          useValue: mockTaskIntegrationChecksService,
        },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(TaskIntegrationsController);
    jest.clearAllMocks();

    mockTaskFindUnique.mockResolvedValue({
      id: 'task_1',
      organizationId: 'org_1',
      status: 'todo',
      frequency: null,
    });
    mockProviderRepository.findById.mockResolvedValue({
      id: 'prov_aws',
      slug: 'aws',
    });
    mockedGetManifest.mockReturnValue(MANIFEST);
    // Default: treat the provider as NOT a code manifest, so isDynamic falls
    // through to the dynamicIntegration lookup (pre-guard behavior). The
    // code-manifest case is exercised explicitly in its own test. Set here so a
    // test that opts into `true` never leaks into the next (clearAllMocks keeps
    // implementations).
    mockedIsCodeManifest.mockReturnValue(false);
    // Default: no active exceptions (existing tests behave as before).
    mockFindingExceptionFindMany.mockResolvedValue([]);
    mockCheckRunRepository.create.mockImplementation(() =>
      Promise.resolve({ id: 'icr_x', startedAt: new Date() }),
    );
    mockCheckRunRepository.complete.mockResolvedValue({});
    mockCheckRunRepository.addResults.mockResolvedValue({});
    // Default: nothing excepted (no count query needed). Exception tests
    // override this to the exact excepted-failure count for the run.
    mockCheckRunRepository.countExceptedFailures.mockResolvedValue(0);
    // Default: no last-attempt rows (tests that care set their own).
    mockCheckRunRepository.findLastAttemptPerConnectionAndCheckByTask.mockResolvedValue(
      [],
    );
    mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue(
      VALID_CREDS,
    );
    mockTaskUpdate.mockResolvedValue({});
  });

  const body = { connectionId: 'conn_1', checkId: 'aws-s3-encryption' };

  describe('runCheckForTask (all accounts)', () => {
    it('runs the check for EVERY active account of the provider', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
        {
          id: 'conn_2',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
      ]);
      mockedRunAllChecks.mockResolvedValue(passingResult());

      const result = await controller.runCheckForTask('task_1', 'org_1', body);

      expect(
        mockConnectionRepository.findActiveByProviderAndOrg,
      ).toHaveBeenCalledWith('prov_aws', 'org_1');
      // One run per account.
      expect(mockCheckRunRepository.create).toHaveBeenCalledTimes(2);
      expect(mockedRunAllChecks).toHaveBeenCalledTimes(2);
      expect(result.accountsRun).toBe(2);
      expect(result.success).toBe(true);
      expect(result.taskStatus).toBe('done');
    });

    it('marks the task failed if ANY account has findings', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
        {
          id: 'conn_2',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
      ]);
      mockedRunAllChecks
        .mockResolvedValueOnce(passingResult())
        .mockResolvedValueOnce(failingResult());

      const result = await controller.runCheckForTask('task_1', 'org_1', body);

      expect(result.accountsRun).toBe(2);
      expect(result.totalFindings).toBe(1);
      expect(result.taskStatus).toBe('failed');
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        }),
      );
    });

    it('HOLDS an our-side failure for a dynamic integration (task NOT failed)', async () => {
      // Provider is a dynamic integration → the hold applies.
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_neon',
        slug: 'neon',
      });
      mockDynamicIntegrationFindFirst.mockResolvedValue({ id: 'din_neon' });
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_neon',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_neon',
          metadata: {},
          variables: {},
        },
      ]);
      // The only finding failed for an our-side reason (404).
      mockedRunAllChecks.mockResolvedValue(ourSideFailingResult());

      const result = await controller.runCheckForTask('task_1', 'org_1', {
        connectionId: 'conn_1',
        checkId: 'aws-s3-encryption',
      });

      // Held → indeterminate: task is neither failed nor flipped to done.
      expect(result.taskStatus).toBeNull();
      expect(mockTaskUpdate).not.toHaveBeenCalled();
      // The run ROW is held as 'inconclusive' (not 'failed') with failedCount 0
      // (held findings are not confirmed failures) so no consumer can read it as
      // a failure; the self-heal agent still picks it up via the stored results.
      expect(mockCheckRunRepository.complete).toHaveBeenCalledWith(
        'icr_x',
        expect.objectContaining({ status: 'inconclusive', failedCount: 0 }),
      );
    });

    it('does NOT mark a dynamic task done when a finding is held, even with passes', async () => {
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_neon',
        slug: 'neon',
      });
      mockDynamicIntegrationFindFirst.mockResolvedValue({ id: 'din_neon' });
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_neon',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_neon',
          metadata: {},
          variables: {},
        },
      ]);
      // One passing result + one our-side (404) held finding.
      mockedRunAllChecks.mockResolvedValue({
        results: [
          {
            checkId: 'aws-s3-encryption',
            checkName: 'X',
            status: 'failed',
            durationMs: 10,
            error: undefined,
            result: {
              findings: [
                {
                  resourceType: 'platform',
                  resourceId: 'neon',
                  title: 'unhealthy',
                  description: '404',
                  severity: 'high',
                  remediation: 'x',
                  evidence: { error: 'http_404' },
                },
              ],
              passingResults: [
                {
                  resourceType: 't',
                  resourceId: 'ok1',
                  title: 'ok',
                  description: 'ok',
                },
              ],
              summary: { totalChecked: 2 },
              logs: [],
            },
          },
        ],
      });

      const result = await controller.runCheckForTask('task_1', 'org_1', {
        connectionId: 'conn_1',
        checkId: 'aws-s3-encryption',
      });

      // A held check is unresolved → the task must NOT go done (which would hide
      // it behind the passing result); it stays indeterminate until the fix lands.
      expect(result.taskStatus).toBeNull();
      expect(mockTaskUpdate).not.toHaveBeenCalled();
    });

    it('still fails the task for a dynamic integration on a REAL finding', async () => {
      // Same dynamic provider, but a genuine compliance finding (no error signal).
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_neon',
        slug: 'neon',
      });
      mockDynamicIntegrationFindFirst.mockResolvedValue({ id: 'din_neon' });
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_neon',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_neon',
          metadata: {},
          variables: {},
        },
      ]);
      mockedRunAllChecks.mockResolvedValue(failingResult());

      const result = await controller.runCheckForTask('task_1', 'org_1', {
        connectionId: 'conn_1',
        checkId: 'aws-s3-encryption',
      });

      expect(result.taskStatus).toBe('failed');
      // A genuine compliance finding is a REAL failure — the run row stays
      // 'failed' (visible to the customer), never held.
      expect(mockCheckRunRepository.complete).toHaveBeenCalledWith(
        'icr_x',
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('treats a CODE-BASED provider as static even when a dynamic row shares its slug — shows the real fail, never held (CS-715)', async () => {
      // A code manifest wins over a dynamic integration of the same slug, so the
      // check is static. Pre-fix, the mere existence of the dynamic row forced the
      // run to be HELD as 'inconclusive' (hidden from the customer). It must be
      // classified static: a real finding shows 'failed' and fails the task.
      mockedIsCodeManifest.mockReturnValue(true);
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_gh',
        slug: 'github',
      });
      // An active dynamic 'github' row exists — pre-fix this alone forced the hold.
      mockDynamicIntegrationFindFirst.mockResolvedValue({ id: 'din_github' });
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_gh',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_gh',
          metadata: {},
          variables: {},
        },
      ]);
      mockedRunAllChecks.mockResolvedValue(failingResult());

      const result = await controller.runCheckForTask('task_1', 'org_1', {
        connectionId: 'conn_1',
        checkId: 'aws-s3-encryption',
      });

      // Not held: the finding fails the task and the run row is 'failed' (shown),
      // even though an active dynamic row exists for the same slug.
      expect(result.taskStatus).toBe('failed');
      expect(mockCheckRunRepository.complete).toHaveBeenCalledWith(
        'icr_x',
        expect.objectContaining({ status: 'failed' }),
      );
    });

    it('does NOT fail the task when the only finding is excepted (goes done)', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
      ]);
      // 1 passing (b1) + 1 finding (b2); b2 is under an active exception.
      mockedRunAllChecks.mockResolvedValue(mixedResult());
      mockFindingExceptionFindMany.mockResolvedValue([
        {
          connectionId: 'conn_1',
          checkId: 'aws-s3-encryption',
          resourceId: 'b2',
        },
      ]);

      const result = await controller.runCheckForTask('task_1', 'org_1', body);

      // The raw finding is still counted/persisted, but it must not fail the
      // task — matching the Cloud Tests view + the scheduled run.
      expect(result.totalFindings).toBe(1);
      expect(result.taskStatus).toBe('done');
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'done' }),
        }),
      );
    });

    it('goes done when the only finding is excepted and there are NO passing results', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
      ]);
      // Only a failing finding (b2), zero passing results; b2 is excepted.
      mockedRunAllChecks.mockResolvedValue(failingResult());
      mockFindingExceptionFindMany.mockResolvedValue([
        {
          connectionId: 'conn_1',
          checkId: 'aws-s3-encryption',
          resourceId: 'b2',
        },
      ]);

      const result = await controller.runCheckForTask('task_1', 'org_1', body);

      // No effective failures + no passing — must still transition to done, not
      // stay stuck in the prior status.
      expect(result.taskStatus).toBe('done');
      expect(mockTaskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'done' }),
        }),
      );
    });

    it('records a failed run for a bad account but keeps running the rest', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
        status: 'active',
      });
      mockConnectionRepository.findActiveByProviderAndOrg.mockResolvedValue([
        {
          id: 'conn_1',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
        {
          id: 'conn_2',
          organizationId: 'org_1',
          providerId: 'prov_aws',
          metadata: {},
          variables: {},
        },
      ]);
      // First account has no credentials → recorded failed; second runs fine.
      mockCredentialVaultService.getDecryptedCredentials
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(VALID_CREDS);
      mockedRunAllChecks.mockResolvedValue(passingResult());

      const result = await controller.runCheckForTask('task_1', 'org_1', body);

      expect(mockCheckRunRepository.create).toHaveBeenCalledTimes(2);
      // Only the healthy account actually executed the check.
      expect(mockedRunAllChecks).toHaveBeenCalledTimes(1);
      // The bad account's run was completed as failed.
      expect(mockCheckRunRepository.complete).toHaveBeenCalledWith(
        'icr_x',
        expect.objectContaining({ status: 'failed' }),
      );
      expect(result.accountsRun).toBe(2);
      expect(result.success).toBe(true);
    });

    it('rejects an inactive referenced connection (never runs a non-active account)', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
        status: 'paused',
      });

      await expect(
        controller.runCheckForTask('task_1', 'org_1', body),
      ).rejects.toThrow('Connection is not active');
      expect(
        mockConnectionRepository.findActiveByProviderAndOrg,
      ).not.toHaveBeenCalled();
      expect(mockedRunAllChecks).not.toHaveBeenCalled();
    });
  });

  describe('getTaskCheckRuns', () => {
    it('labels each run with its account id + connection label', async () => {
      mockCheckRunRepository.findLatestPerConnectionAndCheckByTask.mockResolvedValue(
        [
          {
            id: 'icr_1',
            checkId: 'aws-s3-encryption',
            checkName: 'S3',
            status: 'success',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 10,
            totalChecked: 1,
            passedCount: 1,
            failedCount: 0,
            errorMessage: null,
            logs: [],
            connectionId: 'conn_1',
            createdAt: new Date(),
            results: [],
            connection: {
              id: 'conn_1',
              metadata: { connectionName: 'Production AWS' },
              provider: { slug: 'aws', name: 'AWS' },
            },
          },
          {
            id: 'icr_2',
            checkId: 'aws-s3-encryption',
            checkName: 'S3',
            status: 'success',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 10,
            totalChecked: 1,
            passedCount: 1,
            failedCount: 0,
            errorMessage: null,
            logs: [],
            connectionId: 'conn_2',
            createdAt: new Date(),
            results: [],
            connection: {
              id: 'conn_2',
              metadata: { roleArn: 'arn:aws:iam::222222222222:role/x' },
              provider: { slug: 'aws', name: 'AWS' },
            },
          },
        ],
      );

      const { runs } = await controller.getTaskCheckRuns('task_1', 'org_1');

      expect(runs).toHaveLength(2);
      expect(runs[0]).toMatchObject({
        connectionId: 'conn_1',
        connectionLabel: 'Production AWS',
      });
      expect(runs[1]).toMatchObject({
        connectionId: 'conn_2',
        connectionLabel: 'AWS 222222222222',
      });
    });

    it('marks excepted results and drops them from the failed count + status', async () => {
      mockCheckRunRepository.findLatestPerConnectionAndCheckByTask.mockResolvedValue(
        [
          {
            id: 'icr_1',
            checkId: 'aws-s3-public-access',
            checkName: 'S3 public access',
            status: 'failed',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 10,
            totalChecked: 1,
            passedCount: 0,
            failedCount: 1,
            errorMessage: null,
            logs: [],
            connectionId: 'conn_1',
            createdAt: new Date(),
            results: [
              {
                id: 'res_1',
                passed: false,
                resourceType: 'aws-s3-bucket',
                resourceId: 'reports-bucket',
                title: 'Public access not fully blocked: reports-bucket',
                description: 'x',
                severity: 'high',
                remediation: 'fix',
                evidence: {},
                collectedAt: new Date(),
              },
            ],
            connection: {
              id: 'conn_1',
              metadata: { connectionName: 'PRIMER' },
              provider: { slug: 'aws', name: 'AWS' },
            },
          },
        ],
      );
      mockFindingExceptionFindMany.mockResolvedValue([
        {
          id: 'fex_1',
          connectionId: 'conn_1',
          checkId: 'aws-s3-public-access',
          resourceId: 'reports-bucket',
          reason: 'Bucket intentionally public: static website redirect only.',
        },
      ]);
      // The excepted-failure count is now computed via a targeted query (the
      // full result set is no longer loaded). reports-bucket is the one
      // excepted failing result for this run.
      mockCheckRunRepository.countExceptedFailures.mockResolvedValue(1);

      const { runs } = await controller.getTaskCheckRuns('task_1', 'org_1');

      expect(runs[0].failedCount).toBe(0);
      expect(runs[0].exceptedCount).toBe(1);
      expect(runs[0].status).toBe('success');
      expect(runs[0].results[0].excepted).toBe(true);
      // Excepted rows carry the exception's id (for revoke) and its reason.
      expect(runs[0].results[0].exceptionId).toBe('fex_1');
      expect(runs[0].results[0].exceptionReason).toBe(
        'Bucket intentionally public: static website redirect only.',
      );
      // Exact count is computed via the targeted query, scoped to this run's
      // excepted resourceIds (not by loading + filtering every result).
      expect(mockCheckRunRepository.countExceptedFailures).toHaveBeenCalledWith(
        'icr_1',
        ['reports-bucket'],
      );
    });

    it('keeps an execution-error run as failed (no findings, not excepted)', async () => {
      // A failed run with zero findings is an execution error, not an
      // all-excepted run — it must NOT be rewritten to success.
      mockCheckRunRepository.findLatestPerConnectionAndCheckByTask.mockResolvedValue(
        [
          {
            id: 'icr_err',
            checkId: 'aws-s3-public-access',
            checkName: 'S3 public access',
            status: 'failed',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 10,
            totalChecked: 0,
            passedCount: 0,
            failedCount: 0,
            errorMessage: 'Could not assume AWS role',
            logs: [],
            connectionId: 'conn_1',
            createdAt: new Date(),
            results: [],
            connection: {
              id: 'conn_1',
              metadata: { connectionName: 'PRIMER' },
              provider: { slug: 'aws', name: 'AWS' },
            },
          },
        ],
      );
      mockFindingExceptionFindMany.mockResolvedValue([]);

      const { runs } = await controller.getTaskCheckRuns('task_1', 'org_1');

      expect(runs[0].status).toBe('failed');
      expect(runs[0].exceptedCount).toBe(0);
    });

    it('rejects a task that does not belong to the caller’s org (no cross-tenant leak)', async () => {
      // Task lookup scoped to { id, organizationId } returns nothing.
      mockTaskFindUnique.mockResolvedValue(null);

      await expect(
        controller.getTaskCheckRuns('task_other_org', 'org_1'),
      ).rejects.toThrow('Task not found');
      expect(
        mockCheckRunRepository.findLatestPerConnectionAndCheckByTask,
      ).not.toHaveBeenCalled();
    });

    it('returns lastAttempts (incl. held runs) so "Last ran" stays truthful (CS-753)', async () => {
      // The visible runs list can be days older than the newest attempt when
      // recent runs were held (they're excluded from `runs`). The endpoint
      // must surface WHEN each (connection, check) last ran — timestamps only.
      mockCheckRunRepository.findLatestPerConnectionAndCheckByTask.mockResolvedValue(
        [],
      );
      const attempt = {
        connectionId: 'conn_1',
        checkId: 'entra_id_mfa',
        lastAttemptAt: new Date('2026-07-16T06:00:00Z'),
      };
      mockCheckRunRepository.findLastAttemptPerConnectionAndCheckByTask.mockResolvedValue(
        [attempt],
      );

      const response = await controller.getTaskCheckRuns('task_1', 'org_1');

      expect(response.lastAttempts).toEqual([attempt]);
      expect(
        mockCheckRunRepository.findLastAttemptPerConnectionAndCheckByTask,
      ).toHaveBeenCalledWith('task_1');
    });

    it('bounds a run with a huge result set + logs so the payload stays small (CS-588)', async () => {
      // Defense-in-depth response cap: even if a run somehow carries a large
      // result/log set, the serialized response is bounded (results per
      // category, evidence size, log count) while the run's summary counts stay
      // accurate. The PRIMARY fix — never LOADING all result rows from the DB —
      // lives in CheckRunRepository.findLatestPerConnectionAndCheckByTask and is
      // covered in check-run.repository.spec.ts.
      const HUGE = 5000;
      const results = [
        // First finding carries an oversized evidence blob.
        {
          id: 'icx_finding_0',
          passed: false,
          resourceType: 'firebase-user',
          resourceId: 'user_0',
          title: 'finding 0',
          description: 'd',
          severity: 'high',
          remediation: 'fix',
          evidence: { blob: 'x'.repeat(30_000) },
          collectedAt: new Date(),
        },
        ...Array.from({ length: HUGE - 1 }, (_, i) => ({
          id: `icx_finding_${i + 1}`,
          passed: false,
          resourceType: 'firebase-user',
          resourceId: `user_f_${i + 1}`,
          title: 'finding',
          description: 'd',
          severity: 'high',
          remediation: 'fix',
          evidence: { ok: true },
          collectedAt: new Date(),
        })),
        ...Array.from({ length: HUGE }, (_, i) => ({
          id: `icx_pass_${i}`,
          passed: true,
          resourceType: 'firebase-user',
          resourceId: `user_p_${i}`,
          title: 'passing',
          description: 'd',
          evidence: { ok: true },
          collectedAt: new Date(),
        })),
      ];
      const logs = Array.from({ length: HUGE }, (_, i) => ({
        level: 'info',
        message: `log ${i}`,
        timestamp: new Date().toISOString(),
      }));

      mockCheckRunRepository.findLatestPerConnectionAndCheckByTask.mockResolvedValue(
        [
          {
            id: 'icr_huge',
            checkId: 'firebase-employee-access',
            checkName: 'Employee Access',
            status: 'failed',
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 10,
            totalChecked: HUGE * 2,
            passedCount: HUGE,
            failedCount: HUGE,
            errorMessage: null,
            logs,
            connectionId: 'conn_1',
            createdAt: new Date(),
            results,
            connection: {
              id: 'conn_1',
              metadata: { connectionName: 'Firebase' },
              provider: { slug: 'firebase', name: 'Firebase' },
            },
          },
        ],
      );

      const { runs } = await controller.getTaskCheckRuns('task_1', 'org_1');

      // Result detail is bounded (a few findings + a few passing), NOT 10000.
      expect(runs[0].results.length).toBeLessThanOrEqual(15);
      expect(runs[0].results.length).toBeLessThan(results.length);
      // Logs are bounded too.
      expect(Array.isArray(runs[0].logs)).toBe(true);
      if (Array.isArray(runs[0].logs)) {
        expect(runs[0].logs.length).toBeLessThanOrEqual(100);
      }
      // Summary counts remain authoritative (computed from the full set).
      expect(runs[0].passedCount).toBe(HUGE);
      expect(runs[0].failedCount).toBe(HUGE);
      expect(runs[0].exceptedCount).toBe(0);
      // The oversized evidence blob is replaced with a compact placeholder.
      const shippedFinding = runs[0].results.find(
        (r) => r.id === 'icx_finding_0',
      );
      expect(shippedFinding).toBeDefined();
      expect(shippedFinding?.evidence).toMatchObject({ truncated: true });
      // Normal small evidence is left intact.
      const shippedPass = runs[0].results.find((r) => r.passed);
      expect(shippedPass?.evidence).toEqual({ ok: true });
    });
  });
});

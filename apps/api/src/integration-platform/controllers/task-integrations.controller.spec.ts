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
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
  getActiveManifests: jest.fn(),
  runAllChecks: jest.fn(),
}));

import { db } from '@db';
import { getManifest, runAllChecks } from '@trycompai/integration-platform';

const mockedGetManifest = getManifest as jest.Mock;
const mockedRunAllChecks = runAllChecks as jest.Mock;
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
    // Default: no active exceptions (existing tests behave as before).
    mockFindingExceptionFindMany.mockResolvedValue([]);
    mockCheckRunRepository.create.mockImplementation(() =>
      Promise.resolve({ id: 'icr_x', startedAt: new Date() }),
    );
    mockCheckRunRepository.complete.mockResolvedValue({});
    mockCheckRunRepository.addResults.mockResolvedValue({});
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
          connectionId: 'conn_1',
          checkId: 'aws-s3-public-access',
          resourceId: 'reports-bucket',
        },
      ]);

      const { runs } = await controller.getTaskCheckRuns('task_1', 'org_1');

      expect(runs[0].failedCount).toBe(0);
      expect(runs[0].exceptedCount).toBe(1);
      expect(runs[0].status).toBe('success');
      expect(runs[0].results[0].excepted).toBe(true);
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
  });
});

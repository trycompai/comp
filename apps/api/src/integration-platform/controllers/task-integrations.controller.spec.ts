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

    it('records a failed run for a bad account but keeps running the rest', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        providerId: 'prov_aws',
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

      const { runs } = await controller.getTaskCheckRuns('task_1');

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
  });
});

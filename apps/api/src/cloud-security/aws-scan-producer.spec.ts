jest.mock('@db', () => ({
  db: {
    integrationConnection: { findFirst: jest.fn(), update: jest.fn() },
    integrationCheckRun: { create: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@trycompai/integration-platform', () => ({
  ...jest.requireActual('../../test/fixtures/native-completion-sdk').nativeSdk,
  getManifest: jest.fn(() => ({ auth: { type: 'custom' } })),
}));
jest.mock('./aws-task-completion', () => ({ autoSatisfyAwsTasks: jest.fn() }));
jest.mock('./providers/gcp-security.service', () => ({
  GCPSecurityService: class {},
}));
jest.mock('./providers/aws-security.service', () => ({
  AWSSecurityService: class {},
}));
jest.mock('./providers/azure-security.service', () => ({
  AzureSecurityService: class {},
}));

import { db } from '@db';
import { CloudSecurityService } from './cloud-security.service';
import type { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import type { OAuthCredentialsService } from '../integration-platform/services/oauth-credentials.service';
import type { GCPSecurityService } from './providers/gcp-security.service';
import type { AWSSecurityService } from './providers/aws-security.service';
import type { AzureSecurityService } from './providers/azure-security.service';
import type { CloudReconciliationService } from './reconciliation.service';
import { autoSatisfyAwsTasks } from './aws-task-completion';
import { awsScanBinding } from './aws-scan-binding';
import {
  nativeSdk,
  NATIVE_SOURCE_FIXTURE,
} from '../../test/fixtures/native-completion-sdk';
import { finding, NOW } from '../../test/fixtures/aws-task-completion-data';

const models = db as unknown as {
  integrationConnection: { findFirst: jest.Mock; update: jest.Mock };
  integrationCheckRun: { create: jest.Mock; updateMany: jest.Mock };
  $transaction: jest.Mock;
};

describe('the actual cloud scan producer binds its stored AWS attempt', () => {
  const selected = jest.fn();
  const scanProvider = jest.fn();
  const updateRun = jest.fn();
  const createRun = jest.fn();
  const createResults = jest.fn();
  const reconcile = jest.fn();
  const connection = {
    id: 'connection',
    organizationId: 'synthetic-org',
    status: 'active',
    variables: { enabledServices: ['s3'] },
    metadata: { awsScanMode: 'comp_scanners' },
    provider: { slug: 'aws' },
  };
  let service: CloudSecurityService;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    nativeSdk.getNativeSourceIdentity.mockReturnValue(NATIVE_SOURCE_FIXTURE);
    models.integrationConnection.findFirst.mockResolvedValue(connection);
    models.integrationConnection.update.mockResolvedValue({});
    models.integrationCheckRun.create.mockResolvedValue({ id: 'stored-run' });
    models.integrationCheckRun.updateMany.mockResolvedValue({ count: 1 });
    updateRun.mockResolvedValue({ id: 'stored-run' });
    createRun.mockResolvedValue({ id: 'stored-run' });
    createResults.mockResolvedValue({ count: 1 });
    models.$transaction.mockImplementation(
      (callback: (client: unknown) => unknown) =>
        callback({
          integrationCheckRun: { update: updateRun, create: createRun },
          integrationCheckResult: { createMany: createResults },
        }),
    );
    selected.mockResolvedValue({
      credentials: { roleArn: 'synthetic-role' },
      credentialRevision: 'selected-revision',
    });
    scanProvider.mockImplementation(() => {
      jest.setSystemTime(new Date(NOW.getTime() + 60000));
      return Promise.resolve([finding()]);
    });
    (autoSatisfyAwsTasks as jest.Mock).mockResolvedValue({
      count: 0,
      passingServices: [],
    });
    service = new CloudSecurityService(
      {
        getDecryptedCredentialsWithRevision: selected,
        getDecryptedCredentials: () =>
          Promise.resolve({ roleArn: 'synthetic-role' }),
      } as unknown as CredentialVaultService,
      {} as OAuthCredentialsService,
      {} as GCPSecurityService,
      { scanSecurityFindings: scanProvider } as unknown as AWSSecurityService,
      {} as AzureSecurityService,
      { reconcile } as unknown as CloudReconciliationService,
    );
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it('registers the real pending attempt before provider execution with its actual start', async () => {
    expect((await service.scan('connection', 'synthetic-org')).success).toBe(
      true,
    );
    expect(models.integrationCheckRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        connectionId: 'connection',
        checkId: 'aws-security-scan',
        status: 'running',
        startedAt: NOW,
        createdAt: NOW,
      }),
    });
    expect(
      models.integrationCheckRun.create.mock.invocationCallOrder[0],
    ).toBeLessThan(scanProvider.mock.invocationCallOrder[0]);
    expect(updateRun).toHaveBeenCalledWith({
      where: {
        id: 'stored-run',
        connectionId: 'connection',
        status: 'running',
      },
      data: expect.objectContaining({
        startedAt: NOW,
        completedAt: new Date(NOW.getTime() + 60000),
      }),
    });
  });
  it('atomically stores results and the binding of the actual selected revision and inputs', async () => {
    await service.scan('connection', 'synthetic-org');
    const binding = awsScanBinding({
      connection,
      organizationId: 'synthetic-org',
      credentialRevision: 'selected-revision',
      sourceIdentity: NATIVE_SOURCE_FIXTURE,
      runId: 'stored-run',
      startedAt: NOW,
    });
    expect(binding).not.toBeNull();
    expect(updateRun).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completionEvidenceBinding: binding,
          totalChecked: 1,
          passedCount: 1,
          failedCount: 0,
        }),
      }),
    );
    expect(createResults).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          checkRunId: 'stored-run',
          passed: true,
          evidence: { serviceId: 'kms' },
        }),
      ],
    });
    expect(models.$transaction).toHaveBeenCalledTimes(1);
    expect(autoSatisfyAwsTasks).toHaveBeenCalledWith({
      organizationId: 'synthetic-org',
      connectionId: 'connection',
      runId: 'stored-run',
    });
  });
  it('retains successful collection with NULL provenance when the actual source identity is unavailable', async () => {
    nativeSdk.getNativeSourceIdentity.mockReturnValue(null);
    expect((await service.scan('connection', 'synthetic-org')).success).toBe(
      true,
    );
    expect(updateRun).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'success',
          completionEvidenceBinding: null,
        }),
      }),
    );
  });
  it('persists a failed pending attempt and never submits transient findings after a provider error', async () => {
    scanProvider.mockRejectedValue(new Error('synthetic provider failure'));
    expect((await service.scan('connection', 'synthetic-org')).success).toBe(
      false,
    );
    expect(models.integrationCheckRun.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'stored-run',
        connectionId: 'connection',
        status: 'running',
      },
      data: expect.objectContaining({
        status: 'failed',
        errorMessage: 'synthetic provider failure',
      }),
    });
    expect(autoSatisfyAwsTasks).not.toHaveBeenCalled();
    expect(createResults).not.toHaveBeenCalled();
  });
});

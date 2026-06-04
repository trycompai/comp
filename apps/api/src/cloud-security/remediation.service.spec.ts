import { db } from '@db';
import { RemediationService } from './remediation.service';
import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { AWSSecurityService } from './providers/aws-security.service';
import { AiRemediationService } from './ai-remediation.service';
import { GcpRemediationService } from './gcp-remediation.service';
import { AzureRemediationService } from './azure-remediation.service';

jest.mock('@db', () => ({
  db: {
    integrationConnection: { findFirst: jest.fn() },
    integrationCheckResult: { findFirst: jest.fn() },
  },
  Prisma: {},
}));

const mockDb = db as unknown as {
  integrationConnection: { findFirst: jest.Mock };
  integrationCheckResult: { findFirst: jest.Mock };
};

function makeService(params?: {
  credentialVaultService?: Partial<CredentialVaultService>;
}): RemediationService {
  const credentialVaultService = {
    getDecryptedCredentials: jest.fn(),
    ...(params?.credentialVaultService ?? {}),
  };

  return new RemediationService(
    credentialVaultService as unknown as CredentialVaultService,
    {} as unknown as AWSSecurityService,
    {} as unknown as AiRemediationService,
    {} as unknown as GcpRemediationService,
    {} as unknown as AzureRemediationService,
  );
}

describe('RemediationService.previewRemediation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns manual previews without requiring decrypted AWS credentials', async () => {
    const getDecryptedCredentials = jest.fn();
    const service = makeService({
      credentialVaultService: { getDecryptedCredentials },
    });

    mockDb.integrationConnection.findFirst.mockResolvedValue({
      id: 'conn_123',
      provider: { slug: 'aws' },
    });
    mockDb.integrationCheckResult.findFirst.mockResolvedValue({
      id: 'chk_123',
      title: 'RDS instance is not encrypted',
      description: 'RDS encryption requires snapshot copy and restore.',
      severity: 'high',
      resourceId: 'arn:aws:rds:us-east-1:123456789012:db:test',
      resourceType: 'AwsRdsDbInstance',
      evidence: { findingKey: 'rds-encryption-test' },
      remediation:
        '[MANUAL] Cannot be auto-fixed. RDS encryption can only be enabled at creation time.',
    });

    const preview = await service.previewRemediation({
      connectionId: 'conn_123',
      organizationId: 'org_123',
      checkResultId: 'chk_123',
      remediationKey: 'rds-encryption-test',
    });

    expect(preview.guidedOnly).toBe(true);
    expect(preview.apiCalls).toEqual([]);
    expect(getDecryptedCredentials).not.toHaveBeenCalled();
  });
});

describe('RemediationService.isUsablePlan (plan-cache guard)', () => {
  const service = makeService();
  const callIsUsable = (plan: unknown): boolean =>
    (
      service as unknown as { isUsablePlan: (p: unknown) => boolean }
    ).isUsablePlan(plan);

  it('treats an empty fix plan as unusable so it is never cached/reused (Retry can regenerate)', () => {
    expect(callIsUsable({ canAutoFix: true, fixSteps: [] })).toBe(false);
  });

  it('treats a non-auto-fixable plan as unusable', () => {
    expect(
      callIsUsable({ canAutoFix: false, fixSteps: [{ command: 'X' }] }),
    ).toBe(false);
  });

  it('treats undefined as unusable', () => {
    expect(callIsUsable(undefined)).toBe(false);
  });

  it('treats an auto-fixable plan with at least one fix step as usable', () => {
    expect(
      callIsUsable({
        canAutoFix: true,
        fixSteps: [{ command: 'PutConfigurationRecorderCommand' }],
      }),
    ).toBe(true);
  });
});

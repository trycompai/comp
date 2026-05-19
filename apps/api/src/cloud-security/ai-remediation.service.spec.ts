// Mock @db before importing the service so the Prisma client doesn't try
// to connect at import time in this unit-test env.
jest.mock('@db', () => ({}));
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: () => null,
}));
jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));

import type { FixPlan } from './ai-remediation.prompt';
import { AiRemediationService } from './ai-remediation.service';

// `enrichEmptyState` isn't exported — exercise it through the service's
// public methods by mocking generateObject to return a known-empty plan.
import { generateObject } from 'ai';

function basePlan(overrides: Partial<FixPlan> = {}): FixPlan {
  return {
    canAutoFix: true,
    risk: 'low',
    description: 'desc',
    currentState: {},
    proposedState: {},
    requiredPermissions: [],
    readSteps: [],
    fixSteps: [],
    rollbackSteps: [],
    rollbackSupported: false,
    requiresAcknowledgment: false,
    ...overrides,
  } as FixPlan;
}

describe('AiRemediationService.generateFixPlan empty-state backstop', () => {
  const generateObjectMock = generateObject as unknown as jest.Mock;

  beforeEach(() => {
    generateObjectMock.mockReset();
  });

  it('fills empty state with { exists: false } / { exists: true } when AI returns both empty', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        fixSteps: [
          { service: 'cloudtrail', command: 'CreateTrailCommand', params: {}, purpose: 'Create trail' },
          { service: 's3', command: 'CreateBucketCommand', params: {}, purpose: 'Create bucket' },
          { service: 'cloudtrail', command: 'StartLoggingCommand', params: {}, purpose: 'Start logging' },
        ],
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 'No CloudTrail trails configured',
      description: 'No CloudTrail trails exist.',
      severity: 'critical',
      resourceType: 'AwsAccount',
      resourceId: 'account-level',
      remediation: 'Create a multi-region trail.',
      findingKey: 'cloudtrail-no-trails',
      evidence: { awsAccountId: '123', service: 'CloudTrail' },
    });

    expect(plan.currentState).toEqual({ exists: false });
    expect(plan.proposedState).toEqual({
      exists: true,
      willCreate: ['cloudtrail:Trail', 's3:Bucket'],
    });
  });

  it('leaves both states empty when AI returns {}/{} for an update-style plan (no Create* commands)', async () => {
    // Previously this test asserted the backstop fabricated
    // `{ exists: false }` / `{ exists: true }` even for updates, which
    // misrepresented the diff in the UI ("we'll create it" when the truth
    // was "we'll update the existing one"). The backstop now only fires
    // when at least one `Create*` command is present.
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        fixSteps: [
          { service: 'iam', command: 'UpdateAccountPasswordPolicyCommand', params: {}, purpose: 'Update password policy' },
        ],
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 'Weak password policy',
      description: null,
      severity: null,
      resourceType: 'AwsIamPolicy',
      resourceId: 'account-level',
      remediation: null,
      findingKey: 'iam-weak-password',
      evidence: {},
    });

    expect(plan.currentState).toEqual({});
    expect(plan.proposedState).toEqual({});
  });

  it('leaves a plan untouched when currentState is non-empty', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        currentState: { versioning: 'Disabled' },
        proposedState: { versioning: 'Enabled' },
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 'S3 versioning disabled',
      description: null,
      severity: null,
      resourceType: 'S3Bucket',
      resourceId: 'logs-archive',
      remediation: null,
      findingKey: 's3-versioning-disabled',
      evidence: {},
    });

    expect(plan.currentState).toEqual({ versioning: 'Disabled' });
    expect(plan.proposedState).toEqual({ versioning: 'Enabled' });
  });

  it('leaves a plan alone when only one side is empty (legitimate verify-only case)', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        currentState: { someField: 'X' },
        proposedState: {},
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 't',
      description: null,
      severity: null,
      resourceType: 'X',
      resourceId: 'y',
      remediation: null,
      findingKey: 'fk',
      evidence: {},
    });

    expect(plan.currentState).toEqual({ someField: 'X' });
    expect(plan.proposedState).toEqual({});
  });
});

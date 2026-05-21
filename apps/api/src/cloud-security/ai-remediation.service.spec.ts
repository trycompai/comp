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

  it('emits configured:false → configured:true with willChange for update/configure-style plans (Bug B fix)', async () => {
    // Customers reported the Auto-Remediate dialog showed `{} → {}` for
    // findings whose fix is a configure-only flow (Put*/Start*/Update*).
    // The backstop now derives a meaningful diff from the actionable
    // steps instead of leaving both states blank.
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

    expect(plan.currentState).toEqual({ configured: false });
    expect(plan.proposedState).toEqual({
      configured: true,
      willChange: ['iam:AccountPasswordPolicy'],
    });
  });

  it('emits configured:false → configured:true for the Config-recorder fix (Put + Start, no Create)', async () => {
    // The exact plan shape that caused the customer-reported `{} → {}`
    // bug on "AWS Config recorder not configured". No Create* steps;
    // only Put*/Start*. Backstop now produces a meaningful diff.
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        fixSteps: [
          { service: 'iam', command: 'CreateServiceLinkedRoleCommand', params: { AWSServiceName: 'config.amazonaws.com' }, purpose: 'Create SLR for AWS Config' },
          { service: 'config-service', command: 'PutConfigurationRecorderCommand', params: {}, purpose: 'Create recorder' },
          { service: 'config-service', command: 'PutDeliveryChannelCommand', params: {}, purpose: 'Configure delivery' },
          { service: 'config-service', command: 'StartConfigurationRecorderCommand', params: {}, purpose: 'Start recorder' },
        ],
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 'AWS Config recorder not configured',
      description: null,
      severity: 'high',
      resourceType: 'AwsAccount',
      resourceId: 'account-level',
      remediation: null,
      findingKey: 'config-no-recorder',
      evidence: {},
    });

    // CreateServiceLinkedRoleCommand IS a Create — so the plan is still
    // treated as create-from-scratch (the SLR step). The willCreate list
    // surfaces only the resource being created (iam:ServiceLinkedRole),
    // and the Put/Start configure steps drop into the diff via the
    // create-from-scratch path.
    expect(plan.currentState).toEqual({ exists: false });
    expect(plan.proposedState).toEqual({
      exists: true,
      willCreate: ['iam:ServiceLinkedRole'],
    });
  });

  it('leaves the plan untouched when AI returns {}/{} but the plan has no actionable steps', async () => {
    // Verify-only plans (only readSteps) should still be left alone —
    // we never fabricate state when there's nothing to act on.
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        readSteps: [
          { service: 's3', command: 'GetBucketVersioningCommand', params: {}, purpose: 'check' },
        ],
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 'Read-only',
      description: null,
      severity: null,
      resourceType: 'X',
      resourceId: 'y',
      remediation: null,
      findingKey: 'fk-readonly',
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

  it('runs normalizeFixPlan after enrichEmptyState — SLR AWSServiceName is backfilled (Bug A fix)', async () => {
    // The AI sometimes omits AWSServiceName on CreateServiceLinkedRoleCommand,
    // which AWS rejects with "Member must not be null". The service must
    // wire normalizeFixPlan after enrichEmptyState so the param is
    // backfilled from cross-step context before the plan reaches the UI
    // or the executor.
    generateObjectMock.mockResolvedValueOnce({
      object: basePlan({
        currentState: { recorder: 'not configured' },
        proposedState: { recorder: 'configured' },
        fixSteps: [
          { service: 'iam', command: 'CreateServiceLinkedRoleCommand', params: {}, purpose: 'Create SLR for AWS Config' },
          { service: 'config-service', command: 'PutConfigurationRecorderCommand', params: { ConfigurationRecorder: {} }, purpose: 'Create recorder' },
        ],
      }),
    });

    const service = new AiRemediationService();
    const plan = await service.generateFixPlan({
      title: 'AWS Config recorder not configured',
      description: null,
      severity: 'high',
      resourceType: 'AwsAccount',
      resourceId: 'account-level',
      remediation: null,
      findingKey: 'config-no-recorder',
      evidence: {},
    });

    expect(plan.fixSteps[0].params).toEqual({
      AWSServiceName: 'config.amazonaws.com',
    });
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

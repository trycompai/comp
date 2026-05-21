import type { AwsCommandStep, FixPlan } from './ai-remediation.prompt';
import {
  AWS_SERVICE_LINKED_ROLE_PRINCIPAL,
  normalizeFixPlan,
} from './plan-normalizer';

function makeStep(overrides: Partial<AwsCommandStep> = {}): AwsCommandStep {
  return {
    service: overrides.service ?? 'iam',
    command: overrides.command ?? 'CreateRoleCommand',
    params: overrides.params ?? {},
    purpose: overrides.purpose ?? 'test step',
  };
}

function makePlan(
  opts: {
    fixSteps?: AwsCommandStep[];
    rollbackSteps?: AwsCommandStep[];
  } = {},
): FixPlan {
  return {
    canAutoFix: true,
    risk: 'medium',
    description: 'test plan',
    currentState: {},
    proposedState: {},
    requiredPermissions: [],
    readSteps: [],
    fixSteps: opts.fixSteps ?? [],
    rollbackSteps: opts.rollbackSteps ?? [],
    rollbackSupported: true,
    requiresAcknowledgment: false,
  };
}

describe('normalizeFixPlan — CreateServiceLinkedRoleCommand backfill', () => {
  it('is a no-op for a plan with no SLR steps', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({ service: 's3', command: 'PutBucketVersioningCommand' }),
      ],
    });
    expect(normalizeFixPlan(plan)).toEqual(plan);
  });

  it('preserves AWSServiceName when already set to a non-empty string', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: { AWSServiceName: 'config.amazonaws.com' },
        }),
        makeStep({
          service: 'config-service',
          command: 'PutConfigurationRecorderCommand',
        }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.fixSteps[0].params).toEqual({
      AWSServiceName: 'config.amazonaws.com',
    });
  });

  describe('backfills the right principal for each known service', () => {
    const cases: ReadonlyArray<{
      siblingService: string;
      expectedPrincipal: string;
    }> = [
      {
        siblingService: 'config-service',
        expectedPrincipal: 'config.amazonaws.com',
      },
      { siblingService: 'config', expectedPrincipal: 'config.amazonaws.com' },
      {
        siblingService: 'guardduty',
        expectedPrincipal: 'guardduty.amazonaws.com',
      },
      {
        siblingService: 'inspector2',
        expectedPrincipal: 'inspector2.amazonaws.com',
      },
      { siblingService: 'macie2', expectedPrincipal: 'macie.amazonaws.com' },
      {
        siblingService: 'accessanalyzer',
        expectedPrincipal: 'access-analyzer.amazonaws.com',
      },
      {
        siblingService: 'securityhub',
        expectedPrincipal: 'securityhub.amazonaws.com',
      },
    ];

    for (const { siblingService, expectedPrincipal } of cases) {
      it(`infers "${expectedPrincipal}" when neighbor service is "${siblingService}"`, () => {
        const plan = makePlan({
          fixSteps: [
            makeStep({
              service: 'iam',
              command: 'CreateServiceLinkedRoleCommand',
              params: {},
            }),
            makeStep({
              service: siblingService,
              command: 'EnableSomethingCommand',
            }),
          ],
        });
        const result = normalizeFixPlan(plan);
        expect(result.fixSteps[0].params).toEqual({
          AWSServiceName: expectedPrincipal,
        });
      });
    }
  });

  it('treats empty-string AWSServiceName as missing and backfills', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: { AWSServiceName: '' },
        }),
        makeStep({ service: 'guardduty', command: 'CreateDetectorCommand' }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.fixSteps[0].params).toEqual({
      AWSServiceName: 'guardduty.amazonaws.com',
    });
  });

  it('treats explicit null AWSServiceName as missing and backfills', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: { AWSServiceName: null },
        }),
        makeStep({
          service: 'macie2',
          command: 'EnableOrganizationAdminAccountCommand',
        }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.fixSteps[0].params).toEqual({
      AWSServiceName: 'macie.amazonaws.com',
    });
  });

  it('leaves the step untouched when no neighbor has a known SLR principal', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: {},
        }),
        makeStep({ service: 'sts', command: 'AssumeRoleCommand' }),
        makeStep({ service: 'kms', command: 'CreateKeyCommand' }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.fixSteps[0].params).toEqual({});
  });

  it('skips IAM/STS siblings when searching for the principal', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({ service: 'iam', command: 'AttachRolePolicyCommand' }),
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: {},
        }),
        makeStep({
          service: 'config-service',
          command: 'PutConfigurationRecorderCommand',
        }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.fixSteps[1].params).toEqual({
      AWSServiceName: 'config.amazonaws.com',
    });
  });

  it('backfills each SLR step independently via nearest-neighbor in a multi-SLR plan', () => {
    // Layout: [SLR-A, guardduty, SLR-B, config]
    // SLR-A (idx 0) nearest non-IAM = guardduty (offset 1).
    // SLR-B (idx 2) nearest non-IAM = config (offset 1 to the right beats
    //   guardduty at offset 1 to the left because we check right first).
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: {},
        }),
        makeStep({ service: 'guardduty', command: 'CreateDetectorCommand' }),
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: {},
        }),
        makeStep({
          service: 'config-service',
          command: 'PutConfigurationRecorderCommand',
        }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.fixSteps[0].params).toEqual({
      AWSServiceName: 'guardduty.amazonaws.com',
    });
    expect(result.fixSteps[2].params).toEqual({
      AWSServiceName: 'config.amazonaws.com',
    });
  });

  it('also normalizes rollback steps', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'config-service',
          command: 'PutConfigurationRecorderCommand',
        }),
      ],
      rollbackSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: {},
        }),
        makeStep({
          service: 'config-service',
          command: 'DeleteConfigurationRecorderCommand',
        }),
      ],
    });
    const result = normalizeFixPlan(plan);
    expect(result.rollbackSteps[0].params).toEqual({
      AWSServiceName: 'config.amazonaws.com',
    });
  });

  it('is idempotent — running twice equals running once', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: {},
        }),
        makeStep({ service: 'guardduty', command: 'CreateDetectorCommand' }),
      ],
    });
    const once = normalizeFixPlan(plan);
    const twice = normalizeFixPlan(once);
    expect(twice).toEqual(once);
  });

  it('does not mutate the input plan', () => {
    const slrStep = makeStep({
      service: 'iam',
      command: 'CreateServiceLinkedRoleCommand',
      params: {},
    });
    const plan = makePlan({
      fixSteps: [
        slrStep,
        makeStep({ service: 'guardduty', command: 'CreateDetectorCommand' }),
      ],
    });
    normalizeFixPlan(plan);
    expect(slrStep.params).toEqual({});
  });

  it('exports a non-empty AWS_SERVICE_LINKED_ROLE_PRINCIPAL map covering core services', () => {
    expect(AWS_SERVICE_LINKED_ROLE_PRINCIPAL.config).toBe('config.amazonaws.com');
    expect(AWS_SERVICE_LINKED_ROLE_PRINCIPAL.guardduty).toBe(
      'guardduty.amazonaws.com',
    );
    expect(AWS_SERVICE_LINKED_ROLE_PRINCIPAL.inspector2).toBe(
      'inspector2.amazonaws.com',
    );
    expect(AWS_SERVICE_LINKED_ROLE_PRINCIPAL.macie2).toBe('macie.amazonaws.com');
    expect(AWS_SERVICE_LINKED_ROLE_PRINCIPAL.securityhub).toBe(
      'securityhub.amazonaws.com',
    );
    expect(AWS_SERVICE_LINKED_ROLE_PRINCIPAL.accessanalyzer).toBe(
      'access-analyzer.amazonaws.com',
    );
  });
});

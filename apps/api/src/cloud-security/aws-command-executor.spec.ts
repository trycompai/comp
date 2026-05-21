import type { AwsCommandStep } from './ai-remediation.prompt';
import {
  REQUIRED_PARAMS,
  looksLikeValidationError,
  validatePlanSteps,
} from './aws-command-executor';

function step(overrides: Partial<AwsCommandStep>): AwsCommandStep {
  return {
    service: overrides.service ?? 's3',
    command: overrides.command ?? 'PutBucketVersioningCommand',
    params: overrides.params ?? {},
    purpose: overrides.purpose ?? 'test step',
  };
}

/**
 * Focused tests for the REQUIRED_PARAMS branch added to validatePlanSteps.
 * The non-null-param checks defend against AWS's confusing
 * "Member must not be null" errors by failing fast with a clear message.
 */
describe('validatePlanSteps — REQUIRED_PARAMS', () => {
  it('reports a clear error when CreateServiceLinkedRoleCommand is missing AWSServiceName', () => {
    const errors = validatePlanSteps([
      step({
        service: 'iam',
        command: 'CreateServiceLinkedRoleCommand',
        params: {},
      }),
    ]);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /Step 1 \(CreateServiceLinkedRoleCommand\): Required param "AWSServiceName" is missing or empty/,
        ),
      ]),
    );
  });

  it('does NOT error when AWSServiceName is populated', () => {
    const errors = validatePlanSteps([
      step({
        service: 'iam',
        command: 'CreateServiceLinkedRoleCommand',
        params: { AWSServiceName: 'config.amazonaws.com' },
      }),
    ]);
    expect(
      errors.filter((e) => e.includes('AWSServiceName')),
    ).toHaveLength(0);
  });

  it.each(['', null, undefined])(
    'treats %p as missing for required-param checks',
    (badValue) => {
      const errors = validatePlanSteps([
        step({
          service: 'iam',
          command: 'CreateServiceLinkedRoleCommand',
          params: { AWSServiceName: badValue },
        }),
      ]);
      expect(
        errors.some((e) =>
          /Required param "AWSServiceName" is missing or empty/.test(e),
        ),
      ).toBe(true);
    },
  );

  it('reports both missing required params for PutBucketPolicyCommand', () => {
    const errors = validatePlanSteps([
      step({
        service: 's3',
        command: 'PutBucketPolicyCommand',
        params: {},
      }),
    ]);
    expect(
      errors.filter((e) => /Required param "Bucket"/.test(e)),
    ).toHaveLength(1);
    expect(
      errors.filter((e) => /Required param "Policy"/.test(e)),
    ).toHaveLength(1);
  });

  it('does NOT apply required-param checks to commands not in REQUIRED_PARAMS', () => {
    // PutBucketVersioningCommand isn't in REQUIRED_PARAMS — should pass
    // even with no params (the AWS SDK will surface its own errors then).
    const errors = validatePlanSteps([
      step({
        service: 's3',
        command: 'PutBucketVersioningCommand',
        params: {},
      }),
    ]);
    // It might still error on other things (e.g., placeholder check),
    // but it must NOT report a "Required param" error.
    expect(errors.some((e) => /Required param /.test(e))).toBe(false);
  });

  it('uses the step index in the error message so customers know which step is broken', () => {
    const errors = validatePlanSteps([
      step({ service: 's3', command: 'PutBucketVersioningCommand', params: { Bucket: 'b', VersioningConfiguration: { Status: 'Enabled' } } }),
      step({
        service: 'iam',
        command: 'CreateServiceLinkedRoleCommand',
        params: {},
      }),
    ]);
    expect(
      errors.find((e) =>
        e.startsWith('Step 2 (CreateServiceLinkedRoleCommand)'),
      ),
    ).toBeDefined();
  });

  it('exports a REQUIRED_PARAMS map that includes the SLR + Config-recorder bug-report commands', () => {
    expect(REQUIRED_PARAMS.CreateServiceLinkedRoleCommand).toEqual([
      'AWSServiceName',
    ]);
    expect(REQUIRED_PARAMS.PutConfigurationRecorderCommand).toContain(
      'ConfigurationRecorder',
    );
    expect(REQUIRED_PARAMS.StartConfigurationRecorderCommand).toContain(
      'ConfigurationRecorderName',
    );
    expect(REQUIRED_PARAMS.PutDeliveryChannelCommand).toContain(
      'DeliveryChannel',
    );
  });
});

describe('looksLikeValidationError', () => {
  it.each([
    "1 validation error detected: Value at 'aWSServiceName' failed to satisfy constraint: Member must not be null",
    'ValidationException: The Bucket parameter is required',
    'InvalidParameterValue: Value (foo) for parameter X is invalid',
    'Member must not be null',
    'failed to satisfy constraint: Member must have length less than or equal to 64',
    'Missing required parameter Bucket',
    'is required',
    'must be a valid ARN',
  ])('detects %p as a validation-class error', (msg) => {
    expect(looksLikeValidationError(msg)).toBe(true);
  });

  it.each([
    'AccessDeniedException: User is not authorized to perform iam:CreateRole',
    'ThrottlingException: Rate exceeded',
    'ResourceNotFoundException: detector not found',
    'NoSuchBucket: The specified bucket does not exist',
    '',
  ])('rejects %p as a non-validation error', (msg) => {
    expect(looksLikeValidationError(msg)).toBe(false);
  });
});

describe('validatePlanSteps — pre-existing behavior preserved', () => {
  it('still reports unknown services', () => {
    const errors = validatePlanSteps([
      step({ service: 'not-a-real-service', command: 'WhateverCommand' }),
    ]);
    expect(
      errors.find((e) => /Unknown service "not-a-real-service"/.test(e)),
    ).toBeDefined();
  });

  it('still reports placeholder values', () => {
    const errors = validatePlanSteps([
      step({
        service: 's3',
        command: 'PutBucketVersioningCommand',
        params: { Bucket: '{{BUCKET_NAME}}' },
      }),
    ]);
    expect(
      errors.find((e) => /Contains placeholder values/.test(e)),
    ).toBeDefined();
  });
});

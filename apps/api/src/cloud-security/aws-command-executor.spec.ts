import type { AwsCommandStep } from './ai-remediation.prompt';
import {
  REQUIRED_PARAMS,
  looksLikeValidationError,
  normalizeConfigRecordingGroup,
  normalizeMetricFilterTransformations,
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
    expect(errors.filter((e) => e.includes('AWSServiceName'))).toHaveLength(0);
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

  it('requires a group identifier for property-based security-group revoke commands', () => {
    const errors = validatePlanSteps([
      step({
        service: 'ec2',
        command: 'RevokeSecurityGroupIngressCommand',
        params: {
          IpPermissions: [
            {
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            },
          ],
        },
      }),
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        'Step 1 (RevokeSecurityGroupIngressCommand): One of "GroupId" or "GroupName" is required',
      ]),
    );
  });

  it('rejects revoke commands that mix rule IDs with rule properties', () => {
    const errors = validatePlanSteps([
      step({
        service: 'ec2',
        command: 'RevokeSecurityGroupIngressCommand',
        params: {
          GroupId: 'sg-0123abc',
          SecurityGroupRuleIds: ['sgr-0123abc'],
          IpPermissions: [
            {
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            },
          ],
        },
      }),
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        'Step 1 (RevokeSecurityGroupIngressCommand): SecurityGroupRuleIds cannot be combined with rule property params',
      ]),
    );
  });

  it('requires a rule selector for security-group revoke commands', () => {
    const errors = validatePlanSteps([
      step({
        service: 'ec2',
        command: 'RevokeSecurityGroupIngressCommand',
        params: { GroupId: 'sg-0123abc' },
      }),
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        'Step 1 (RevokeSecurityGroupIngressCommand): One of "SecurityGroupRuleIds" or rule property params is required',
      ]),
    );
  });

  it('allows property-based security-group revoke commands when GroupId is present', () => {
    const errors = validatePlanSteps([
      step({
        service: 'ec2',
        command: 'RevokeSecurityGroupIngressCommand',
        params: {
          GroupId: 'sg-0123abc',
          IpPermissions: [
            {
              IpProtocol: 'tcp',
              FromPort: 22,
              ToPort: 22,
              IpRanges: [{ CidrIp: '0.0.0.0/0' }],
            },
          ],
        },
      }),
    ]);

    expect(
      errors.some((e) => /RevokeSecurityGroupIngressCommand/.test(e)),
    ).toBe(false);
  });

  it('allows security-group revoke commands that use SecurityGroupRuleIds only', () => {
    const errors = validatePlanSteps([
      step({
        service: 'ec2',
        command: 'RevokeSecurityGroupIngressCommand',
        params: { SecurityGroupRuleIds: ['sgr-0123abc'] },
      }),
    ]);

    expect(errors.some((e) => /GroupId|GroupName/.test(e))).toBe(false);
  });

  it('treats empty one-of arrays as missing values', () => {
    const errors = validatePlanSteps([
      step({
        service: 'ec2',
        command: 'RevokeSecurityGroupIngressCommand',
        params: { SecurityGroupRuleIds: [] },
      }),
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        'Step 1 (RevokeSecurityGroupIngressCommand): One of "SecurityGroupRuleIds" or rule property params is required',
      ]),
    );
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
      step({
        service: 's3',
        command: 'PutBucketVersioningCommand',
        params: { Bucket: 'b', VersioningConfiguration: { Status: 'Enabled' } },
      }),
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
    'The request must contain the parameter groupName or groupId',
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

/**
 * AWS Config recorder: `allSupported:true` is mutually exclusive with
 * `recordingStrategy` / `exclusionByResourceTypes` / `resourceTypes`. The AI
 * (and a customer's existing exclusion-based recorder) frequently echoes those
 * fields back alongside allSupported:true, which AWS rejects with a
 * ValidationException. normalizeConfigRecordingGroup collapses the group to the
 * single valid "record everything (incl. global IAM)" shape.
 */
describe('normalizeConfigRecordingGroup', () => {
  it('strips conflicting fields when an exclusion-based group is converted to all-supported', () => {
    const input: Record<string, unknown> = {
      ConfigurationRecorder: {
        name: 'default',
        roleARN: 'arn:aws:iam::123:role/aws-service-role/config',
        recordingGroup: {
          allSupported: true,
          recordingStrategy: { useOnly: 'EXCLUSION_BY_RESOURCE_TYPES' },
          exclusionByResourceTypes: {
            resourceTypes: ['AWS::IAM::User', 'AWS::IAM::Role'],
          },
        },
      },
    };
    normalizeConfigRecordingGroup(input);
    const recorder = input.ConfigurationRecorder as Record<string, unknown>;
    expect(recorder.recordingGroup).toEqual({
      allSupported: true,
      includeGlobalResourceTypes: true,
    });
    // name + roleARN are preserved untouched.
    expect(recorder.name).toBe('default');
    expect(recorder.roleARN).toBe(
      'arn:aws:iam::123:role/aws-service-role/config',
    );
  });

  it('converts a pure exclusion strategy (allSupported absent) to all-supported', () => {
    const input: Record<string, unknown> = {
      ConfigurationRecorder: {
        name: 'default',
        recordingGroup: {
          recordingStrategy: { useOnly: 'EXCLUSION_BY_RESOURCE_TYPES' },
          exclusionByResourceTypes: { resourceTypes: ['AWS::IAM::Role'] },
        },
      },
    };
    normalizeConfigRecordingGroup(input);
    const recorder = input.ConfigurationRecorder as Record<string, unknown>;
    expect(recorder.recordingGroup).toEqual({
      allSupported: true,
      includeGlobalResourceTypes: true,
    });
  });

  it('cleans an ALL_SUPPORTED_RESOURCE_TYPES strategy to the minimal valid shape', () => {
    const input: Record<string, unknown> = {
      ConfigurationRecorder: {
        name: 'default',
        recordingGroup: {
          allSupported: true,
          recordingStrategy: { useOnly: 'ALL_SUPPORTED_RESOURCE_TYPES' },
        },
      },
    };
    normalizeConfigRecordingGroup(input);
    expect(
      (input.ConfigurationRecorder as Record<string, unknown>).recordingGroup,
    ).toEqual({ allSupported: true, includeGlobalResourceTypes: true });
  });

  it('leaves an INCLUSION_BY_RESOURCE_TYPES recorder untouched (records only specific types)', () => {
    const recordingGroup = {
      allSupported: false,
      recordingStrategy: { useOnly: 'INCLUSION_BY_RESOURCE_TYPES' },
      resourceTypes: ['AWS::S3::Bucket'],
    };
    const input: Record<string, unknown> = {
      ConfigurationRecorder: { name: 'default', recordingGroup },
    };
    normalizeConfigRecordingGroup(input);
    expect(
      (input.ConfigurationRecorder as Record<string, unknown>).recordingGroup,
    ).toEqual(recordingGroup);
  });

  it('is a no-op when there is no ConfigurationRecorder/recordingGroup', () => {
    const input: Record<string, unknown> = {};
    expect(() => normalizeConfigRecordingGroup(input)).not.toThrow();
    expect(input).toEqual({});

    const input2: Record<string, unknown> = {
      ConfigurationRecorder: { name: 'default' },
    };
    normalizeConfigRecordingGroup(input2);
    expect(input2).toEqual({ ConfigurationRecorder: { name: 'default' } });
  });
});

/**
 * CloudWatch metric filters: `metricTransformations` is a required, non-empty
 * array whose entries' `metricValue` must be a string. The model often emits a
 * single object or a numeric metricValue, which AWS rejects ("metric
 * transformations were not properly provided…") and sends the auto-fix to
 * manual steps. normalizeMetricFilterTransformations coerces the valid shape;
 * REQUIRED_PARAMS catches a truly-missing field before execution.
 */
describe('PutMetricFilterCommand required params + normalization', () => {
  it('enforces the required PutMetricFilter params', () => {
    const errors = validatePlanSteps([
      step({
        service: 'cloudwatch-logs',
        command: 'PutMetricFilterCommand',
        params: { logGroupName: 'lg', filterName: 'fn' }, // missing pattern + transforms
      }),
    ]);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Required param "filterPattern" is missing/),
        expect.stringMatching(/Required param "metricTransformations" is missing/),
      ]),
    );
  });

  it('does not error when all PutMetricFilter params are present', () => {
    const errors = validatePlanSteps([
      step({
        service: 'cloudwatch-logs',
        command: 'PutMetricFilterCommand',
        params: {
          logGroupName: 'lg',
          filterName: 'fn',
          filterPattern: '{ $.eventName = "X" }',
          metricTransformations: [
            { metricName: 'm', metricNamespace: 'CloudTrailMetrics', metricValue: '1' },
          ],
        },
      }),
    ]);
    expect(
      errors.filter((e) => e.includes('PutMetricFilterCommand')),
    ).toHaveLength(0);
  });

  it('wraps a single metricTransformations object in an array', () => {
    const input: Record<string, unknown> = {
      logGroupName: 'lg',
      metricTransformations: {
        metricName: 'm',
        metricNamespace: 'CloudTrailMetrics',
        metricValue: '1',
      },
    };
    normalizeMetricFilterTransformations(input);
    expect(input.metricTransformations).toEqual([
      { metricName: 'm', metricNamespace: 'CloudTrailMetrics', metricValue: '1' },
    ]);
  });

  it('coerces a numeric metricValue to a string', () => {
    const input: Record<string, unknown> = {
      metricTransformations: [
        { metricName: 'm', metricNamespace: 'CloudTrailMetrics', metricValue: 1 },
      ],
    };
    normalizeMetricFilterTransformations(input);
    expect(input.metricTransformations).toEqual([
      { metricName: 'm', metricNamespace: 'CloudTrailMetrics', metricValue: '1' },
    ]);
  });

  it('leaves a well-formed metricTransformations array untouched', () => {
    const good = [
      { metricName: 'm', metricNamespace: 'CloudTrailMetrics', metricValue: '1' },
    ];
    const input: Record<string, unknown> = { metricTransformations: good };
    normalizeMetricFilterTransformations(input);
    expect(input.metricTransformations).toEqual(good);
  });

  it('is a no-op when metricTransformations is absent', () => {
    const input: Record<string, unknown> = { logGroupName: 'lg' };
    expect(() => normalizeMetricFilterTransformations(input)).not.toThrow();
    expect(input).toEqual({ logGroupName: 'lg' });
  });
});

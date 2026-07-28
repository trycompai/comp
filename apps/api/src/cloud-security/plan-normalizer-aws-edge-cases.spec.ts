import type { AwsCommandStep, FixPlan } from './ai-remediation.prompt';
import { normalizeFixPlan } from './plan-normalizer';

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
    requiredPermissions?: string[];
  } = {},
): FixPlan {
  return {
    canAutoFix: true,
    risk: 'medium',
    description: 'test plan',
    currentState: {},
    proposedState: {},
    requiredPermissions: opts.requiredPermissions ?? [],
    readSteps: [],
    fixSteps: opts.fixSteps ?? [],
    rollbackSteps: opts.rollbackSteps ?? [],
    rollbackSupported: true,
    requiresAcknowledgment: false,
  };
}

describe('normalizeFixPlan — AWS remediation edge cases', () => {
  it('removes S3 PutBucketAcl steps and permissions because ACLs are disabled on modern buckets', () => {
    const plan = makePlan({
      requiredPermissions: [
        's3:CreateBucket',
        's3:PutBucketAcl',
        'cloudtrail:CreateTrail',
      ],
      fixSteps: [
        makeStep({
          service: 's3',
          command: 'PutBucketAclCommand',
          params: { Bucket: 'compai-cloudtrail-123-us-east-1', ACL: 'private' },
        }),
        makeStep({
          service: 'cloudtrail',
          command: 'CreateTrailCommand',
          params: { Name: 'compai-cloudtrail', S3BucketName: 'logs' },
        }),
      ],
    });

    const result = normalizeFixPlan(plan);

    expect(result.fixSteps.map((step) => step.command)).toEqual([
      'CreateTrailCommand',
    ]);
    expect(result.requiredPermissions).toEqual([
      's3:CreateBucket',
      'cloudtrail:CreateTrail',
    ]);
  });

  it('backfills GroupId on EC2 security-group ingress commands from the finding resource id', () => {
    const ipPermissions = [
      {
        IpProtocol: 'tcp',
        FromPort: 22,
        ToPort: 22,
        IpRanges: [{ CidrIp: '0.0.0.0/0' }],
      },
    ];
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'ec2',
          command: 'RevokeSecurityGroupIngressCommand',
          params: { IpPermissions: ipPermissions },
        }),
      ],
      rollbackSteps: [
        makeStep({
          service: 'ec2',
          command: 'AuthorizeSecurityGroupIngressCommand',
          params: { IpPermissions: ipPermissions },
        }),
      ],
    });

    const result = normalizeFixPlan(plan, { resourceId: 'sg-0123abc' });

    expect(result.fixSteps[0].params.GroupId).toBe('sg-0123abc');
    expect(result.rollbackSteps[0].params.GroupId).toBe('sg-0123abc');
  });

  it('backfills GroupId on EC2 security-group egress commands from the finding resource id', () => {
    const ipPermissions = [
      {
        IpProtocol: '-1',
        IpRanges: [{ CidrIp: '0.0.0.0/0' }],
      },
    ];
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'ec2',
          command: 'RevokeSecurityGroupEgressCommand',
          params: { IpPermissions: ipPermissions },
        }),
      ],
      rollbackSteps: [
        makeStep({
          service: 'ec2',
          command: 'AuthorizeSecurityGroupEgressCommand',
          params: { IpPermissions: ipPermissions },
        }),
      ],
    });

    const result = normalizeFixPlan(plan, { resourceId: 'sg-0123abc' });

    expect(result.fixSteps[0].params.GroupId).toBe('sg-0123abc');
    expect(result.rollbackSteps[0].params.GroupId).toBe('sg-0123abc');
  });

  it('does not overwrite an explicit security-group GroupName', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({
          service: 'ec2',
          command: 'RevokeSecurityGroupIngressCommand',
          params: { GroupName: 'default' },
        }),
      ],
    });

    const result = normalizeFixPlan(plan, { resourceId: 'sg-0123abc' });

    expect(result.fixSteps[0].params).toEqual({ GroupName: 'default' });
  });
});

// CS-787: the "CloudTrail not integrated with CloudWatch Logs" auto-fix mints a
// new log group, so the AI must invent the name. When it omits/empties
// logGroupName, AWS rejects CreateLogGroup with "Member must not be null" and
// the whole fix falls back to manual steps. The normalizer must guarantee a
// valid name.
describe('normalizeFixPlan — CreateLogGroup logGroupName backfill (CS-787)', () => {
  const createLogGroupStep = (params: Record<string, unknown>): AwsCommandStep =>
    makeStep({ service: 'logs', command: 'CreateLogGroupCommand', params });

  const updateTrailStep = (logGroupArn: string): AwsCommandStep =>
    makeStep({
      service: 'cloudtrail',
      command: 'UpdateTrailCommand',
      params: {
        Name: 'compai-trail',
        CloudWatchLogsLogGroupArn: logGroupArn,
        CloudWatchLogsRoleArn:
          'arn:aws:iam::123456789012:role/CompAI-CloudTrailDelivery',
      },
    });

  it('defaults an OMITTED logGroupName to aws-cloudtrail-logs so AWS does not reject the create', () => {
    const plan = makePlan({ fixSteps: [createLogGroupStep({})] });

    const result = normalizeFixPlan(plan);

    expect(result.fixSteps[0].params.logGroupName).toBe('aws-cloudtrail-logs');
  });

  it('defaults a blank logGroupName to aws-cloudtrail-logs', () => {
    const plan = makePlan({
      fixSteps: [createLogGroupStep({ logGroupName: '   ' })],
    });

    const result = normalizeFixPlan(plan);

    expect(result.fixSteps[0].params.logGroupName).toBe('aws-cloudtrail-logs');
  });

  it('derives the name from the trail step ARN so CreateLogGroup matches what UpdateTrail links to', () => {
    const plan = makePlan({
      fixSteps: [
        createLogGroupStep({ logGroupName: '' }),
        updateTrailStep(
          'arn:aws:logs:us-east-1:123456789012:log-group:/compai/cloudtrail:*',
        ),
      ],
    });

    const result = normalizeFixPlan(plan);

    expect(result.fixSteps[0].params.logGroupName).toBe('/compai/cloudtrail');
  });

  it('preserves a logGroupName the AI already supplied', () => {
    const plan = makePlan({
      fixSteps: [
        createLogGroupStep({ logGroupName: 'my-custom-cloudtrail-lg' }),
        updateTrailStep(
          'arn:aws:logs:us-east-1:123456789012:log-group:something-else:*',
        ),
      ],
    });

    const result = normalizeFixPlan(plan);

    expect(result.fixSteps[0].params.logGroupName).toBe(
      'my-custom-cloudtrail-lg',
    );
  });

  it('also backfills a CreateLogGroup step that appears in rollback steps', () => {
    const plan = makePlan({
      rollbackSteps: [createLogGroupStep({})],
    });

    const result = normalizeFixPlan(plan);

    expect(result.rollbackSteps[0].params.logGroupName).toBe(
      'aws-cloudtrail-logs',
    );
  });

  it('is a no-op for plans without a CreateLogGroup step', () => {
    const plan = makePlan({
      fixSteps: [
        makeStep({ service: 's3', command: 'PutPublicAccessBlockCommand' }),
      ],
    });

    const result = normalizeFixPlan(plan);

    expect(result.fixSteps).toEqual(plan.fixSteps);
  });
});

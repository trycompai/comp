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

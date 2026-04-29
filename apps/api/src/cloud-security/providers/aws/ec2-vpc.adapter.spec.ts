import {
  DescribeFlowLogsCommand,
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  GetEbsEncryptionByDefaultCommand,
  DescribeSecurityGroupsCommand,
} from '@aws-sdk/client-ec2';
import { Ec2VpcAdapter } from './ec2-vpc.adapter';

type SendHandler = (command: unknown) => unknown;

function buildClient(handler: SendHandler) {
  return {
    send: jest.fn((command: unknown) => Promise.resolve(handler(command))),
  } as unknown as Parameters<Ec2VpcAdapter['scan']>[0]['credentials'] extends infer _
    ? import('@aws-sdk/client-ec2').EC2Client
    : never;
}

const noopInstancesResponse = { Reservations: [] };
const noopSgResponse = { SecurityGroups: [] };
const encryptedByDefaultResponse = { EbsEncryptionByDefault: true };

describe('Ec2VpcAdapter — checkVpcFlowLogs', () => {
  const adapter = new Ec2VpcAdapter();

  // Call the private method through scan() with mocked client wiring.
  // scan() constructs its own EC2Client; we override EC2Client by spying on send().
  // To keep this test focused on flow-log logic, we mock the EC2Client module
  // and assert behavior via the returned findings.

  function runScanWithFlowLogs(args: {
    vpcs: Array<{ VpcId: string; IsDefault?: boolean; Tags?: Array<{ Key: string; Value: string }> }>;
    flowLogPages: Array<{ FlowLogs: Array<{ ResourceId: string }>; NextToken?: string }>;
    hasRunningInstances?: boolean;
  }) {
    let flowLogPageIndex = 0;
    const handler: SendHandler = (command) => {
      if (command instanceof DescribeVpcsCommand) {
        return { Vpcs: args.vpcs };
      }
      if (command instanceof DescribeFlowLogsCommand) {
        const page = args.flowLogPages[flowLogPageIndex] ?? { FlowLogs: [] };
        flowLogPageIndex += 1;
        return page;
      }
      if (command instanceof DescribeInstancesCommand) {
        return args.hasRunningInstances
          ? { Reservations: [{ Instances: [{ InstanceId: 'i-abc' }] }] }
          : noopInstancesResponse;
      }
      if (command instanceof GetEbsEncryptionByDefaultCommand) {
        return encryptedByDefaultResponse;
      }
      if (command instanceof DescribeSecurityGroupsCommand) {
        return noopSgResponse;
      }
      return {};
    };

    const client = buildClient(handler);
    // Access the private method for focused testing.
    const fn = (
      adapter as unknown as {
        checkVpcFlowLogs: (
          c: unknown,
          region: string,
          accountId?: string,
        ) => Promise<ReturnType<typeof adapter.scan> extends Promise<infer U> ? U : never>;
      }
    ).checkVpcFlowLogs;
    return fn.call(adapter, client, 'us-east-1', '123456789012');
  }

  it('passes a VPC when a VPC-scope flow log exists for it', async () => {
    const findings = await runScanWithFlowLogs({
      vpcs: [{ VpcId: 'vpc-abc123', IsDefault: false }],
      flowLogPages: [{ FlowLogs: [{ ResourceId: 'vpc-abc123' }] }],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('vpc-flow-logs-vpc-abc123');
    expect(findings[0].passed).toBe(true);
  });

  it('fails a VPC that only has subnet-scope flow logs', async () => {
    const findings = await runScanWithFlowLogs({
      vpcs: [{ VpcId: 'vpc-abc123', IsDefault: false }],
      flowLogPages: [
        {
          FlowLogs: [
            { ResourceId: 'subnet-111' },
            { ResourceId: 'subnet-222' },
          ],
        },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('vpc-no-flow-logs-vpc-abc123');
    expect(findings[0].passed).toBe(false);
  });

  it('fails a VPC that only has ENI-scope flow logs', async () => {
    const findings = await runScanWithFlowLogs({
      vpcs: [{ VpcId: 'vpc-abc123', IsDefault: false }],
      flowLogPages: [{ FlowLogs: [{ ResourceId: 'eni-deadbeef' }] }],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('vpc-no-flow-logs-vpc-abc123');
    expect(findings[0].passed).toBe(false);
  });

  it('fails a VPC when no flow logs exist at all', async () => {
    const findings = await runScanWithFlowLogs({
      vpcs: [{ VpcId: 'vpc-abc123', IsDefault: false }],
      flowLogPages: [{ FlowLogs: [] }],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('vpc-no-flow-logs-vpc-abc123');
    expect(findings[0].passed).toBe(false);
  });

  it('paginates DescribeFlowLogs and recognizes a VPC-scope flow log on a later page', async () => {
    const findings = await runScanWithFlowLogs({
      vpcs: [{ VpcId: 'vpc-abc123', IsDefault: false }],
      flowLogPages: [
        {
          FlowLogs: [{ ResourceId: 'subnet-1' }, { ResourceId: 'eni-1' }],
          NextToken: 'page-2',
        },
        { FlowLogs: [{ ResourceId: 'vpc-abc123' }] },
      ],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('vpc-flow-logs-vpc-abc123');
    expect(findings[0].passed).toBe(true);
  });

  it('handles multiple VPCs with mixed scopes correctly', async () => {
    const findings = await runScanWithFlowLogs({
      vpcs: [
        { VpcId: 'vpc-aaa', IsDefault: false },
        { VpcId: 'vpc-bbb', IsDefault: false },
      ],
      flowLogPages: [
        {
          FlowLogs: [
            { ResourceId: 'vpc-aaa' }, // vpc-aaa: VPC-scope → pass
            { ResourceId: 'subnet-xyz' }, // subnet for vpc-bbb doesn't count
          ],
        },
      ],
    });

    expect(findings).toHaveLength(2);
    const byId = Object.fromEntries(findings.map((f) => [f.resourceId, f]));
    expect(byId['vpc-aaa'].passed).toBe(true);
    expect(byId['vpc-bbb'].passed).toBe(false);
  });
});

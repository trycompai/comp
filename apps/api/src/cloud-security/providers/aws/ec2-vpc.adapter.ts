import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  GetEbsEncryptionByDefaultCommand,
  DescribeVpcsCommand,
  DescribeFlowLogsCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

/** Ports that should never be open to 0.0.0.0/0 */
const SENSITIVE_PORTS: Record<number, string> = {
  22: 'SSH',
  3389: 'RDP',
  3306: 'MySQL',
  5432: 'PostgreSQL',
  1433: 'MSSQL',
  27017: 'MongoDB',
  6379: 'Redis',
  9200: 'Elasticsearch',
};

export class Ec2VpcAdapter implements AwsServiceAdapter {
  readonly serviceId = 'ec2-vpc';
  readonly isGlobal = false;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region, accountId } = params;
    const client = new EC2Client({ region, credentials });

    const results = await Promise.allSettled([
      this.checkSecurityGroups(client, region, accountId),
      this.checkEbsEncryptionDefault(client, region, accountId),
      this.checkVpcFlowLogs(client, region, accountId),
    ]);

    const findings: SecurityFinding[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        findings.push(...result.value);
      }
    }
    return findings;
  }

  private async checkSecurityGroups(
    client: EC2Client,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    let nextToken: string | undefined;
    do {
      const resp = await client.send(
        new DescribeSecurityGroupsCommand({
          MaxResults: 100,
          NextToken: nextToken,
        }),
      );

      for (const sg of resp.SecurityGroups || []) {
        if (!sg.GroupId) continue;

        for (const rule of sg.IpPermissions || []) {
          const openRanges = [
            ...(rule.IpRanges || []).filter((r) => r.CidrIp === '0.0.0.0/0'),
            ...(rule.Ipv6Ranges || []).filter((r) => r.CidrIpv6 === '::/0'),
          ];

          if (openRanges.length === 0) continue;

          // Check if this rule exposes a sensitive port
          const fromPort = rule.FromPort ?? 0;
          const toPort = rule.ToPort ?? 65535;

          for (const [port, service] of Object.entries(SENSITIVE_PORTS)) {
            const portNum = Number(port);
            if (fromPort <= portNum && portNum <= toPort) {
              findings.push(
                this.makeFinding({
                  id: `ec2-sg-open-${sg.GroupId}-${portNum}`,
                  title: `Security group "${sg.GroupName || sg.GroupId}" allows ${service} (${portNum}) from 0.0.0.0/0 (${region})`,
                  description: `Security group ${sg.GroupId} in VPC ${sg.VpcId || 'default'} allows unrestricted inbound access on port ${portNum} (${service}). This exposes the service to the entire internet.`,
                  severity:
                    portNum === 22 || portNum === 3389 ? 'high' : 'critical',
                  resourceType: 'AwsEc2SecurityGroup',
                  resourceId: sg.GroupId,
                  remediation: `Use ec2:RevokeSecurityGroupIngressCommand with GroupId set to '${sg.GroupId}' and IpPermissions containing FromPort: ${portNum}, ToPort: ${portNum}, IpProtocol: 'tcp', and IpRanges: [{ CidrIp: '0.0.0.0/0' }] to remove the open rule. Then use ec2:AuthorizeSecurityGroupIngressCommand with restricted CidrIp values. Rollback: use ec2:AuthorizeSecurityGroupIngressCommand with the original 0.0.0.0/0 CidrIp.`,
                  passed: false,
                  accountId,
                  region,
                }),
              );
            }
          }

          // Check for "all traffic" rule (protocol -1)
          if (rule.IpProtocol === '-1') {
            findings.push(
              this.makeFinding({
                id: `ec2-sg-all-traffic-${sg.GroupId}`,
                title: `Security group "${sg.GroupName || sg.GroupId}" allows all traffic from 0.0.0.0/0 (${region})`,
                description: `Security group ${sg.GroupId} allows all inbound traffic from any source. This is a critical security risk.`,
                severity: 'critical',
                resourceType: 'AwsEc2SecurityGroup',
                resourceId: sg.GroupId,
                remediation: `Use ec2:RevokeSecurityGroupIngressCommand with GroupId set to '${sg.GroupId}' and IpPermissions containing IpProtocol: '-1' and IpRanges: [{ CidrIp: '0.0.0.0/0' }]. Then use ec2:AuthorizeSecurityGroupIngressCommand to add specific port/protocol rules with restricted CIDR ranges. Rollback: use ec2:AuthorizeSecurityGroupIngressCommand with IpProtocol '-1' and CidrIp '0.0.0.0/0'.`,
                passed: false,
                accountId,
                region,
              }),
            );
          }
        }
      }

      nextToken = resp.NextToken;
    } while (nextToken);

    return findings;
  }

  private async checkEbsEncryptionDefault(
    client: EC2Client,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    // Prerequisite: skip EBS default encryption check if no instances or volumes exist
    try {
      const instanceResp = await client.send(
        new DescribeInstancesCommand({ MaxResults: 5 }),
      );
      const hasInstances = (instanceResp.Reservations ?? []).some(
        (r) => (r.Instances ?? []).length > 0,
      );
      if (!hasInstances) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    const resp = await client.send(new GetEbsEncryptionByDefaultCommand({}));

    if (!resp.EbsEncryptionByDefault) {
      return [
        this.makeFinding({
          id: `ec2-ebs-encryption-default-${region}`,
          title: `EBS encryption by default is disabled (${region})`,
          description: `New EBS volumes in ${region} are not encrypted by default. Unencrypted volumes may expose sensitive data.`,
          severity: 'medium',
          resourceType: 'AwsAccount',
          resourceId: `${region}/ebs-default-encryption`,
          remediation: `Use ec2:EnableEbsEncryptionByDefaultCommand (no parameters required, applies to the current region). Optionally use ec2:ModifyEbsDefaultKmsKeyIdCommand with KmsKeyId to set a specific CMK. Only new volumes will be encrypted; existing unencrypted volumes are not affected. Rollback: use ec2:DisableEbsEncryptionByDefaultCommand.`,
          passed: false,
          accountId,
          region,
        }),
      ];
    }

    return [
      this.makeFinding({
        id: `ec2-ebs-encryption-default-${region}`,
        title: `EBS encryption by default is enabled (${region})`,
        description: `New EBS volumes are encrypted by default in ${region}.`,
        severity: 'info',
        resourceType: 'AwsAccount',
        resourceId: `${region}/ebs-default-encryption`,
        passed: true,
        accountId,
        region,
      }),
    ];
  }

  private async checkVpcFlowLogs(
    client: EC2Client,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const vpcsResp = await client.send(new DescribeVpcsCommand({}));
    const vpcs = vpcsResp.Vpcs || [];

    if (vpcs.length === 0) return findings;

    const flowLogsResp = await client.send(
      new DescribeFlowLogsCommand({
        Filter: [{ Name: 'resource-type', Values: ['VPC'] }],
      }),
    );

    const vpcsWithFlowLogs = new Set(
      (flowLogsResp.FlowLogs || []).map((fl) => fl.ResourceId),
    );

    for (const vpc of vpcs) {
      if (!vpc.VpcId) continue;

      // Skip default VPC if it has no running instances
      if (vpc.IsDefault) {
        try {
          const instanceResp = await client.send(
            new DescribeInstancesCommand({
              MaxResults: 5,
              Filters: [
                { Name: 'vpc-id', Values: [vpc.VpcId] },
                { Name: 'instance-state-name', Values: ['running'] },
              ],
            }),
          );
          const hasRunning = (instanceResp.Reservations ?? []).some(
            (r) => (r.Instances ?? []).length > 0,
          );
          if (!hasRunning) continue;
        } catch {
          // If check fails (permissions), fall through to existing behavior
        }
      }

      const nameTag = vpc.Tags?.find((t) => t.Key === 'Name')?.Value;
      const label = nameTag ? `"${nameTag}" (${vpc.VpcId})` : vpc.VpcId;

      if (!vpcsWithFlowLogs.has(vpc.VpcId)) {
        findings.push(
          this.makeFinding({
            id: `vpc-no-flow-logs-${vpc.VpcId}`,
            title: `VPC ${label} has no flow logs enabled (${region})`,
            description: `VPC ${vpc.VpcId} in ${region} does not have flow logs enabled. Network traffic is not being monitored.`,
            severity: 'medium',
            resourceType: 'AwsEc2Vpc',
            resourceId: vpc.VpcId,
            remediation: `Use ec2:CreateFlowLogsCommand with ResourceIds set to ['${vpc.VpcId}'], ResourceType set to 'VPC', TrafficType set to 'ALL', LogDestinationType set to 'cloud-watch-logs', and LogGroupName set to '/aws/vpc-flow-logs/${vpc.VpcId}'. You must provide DeliverLogsPermissionArn with an IAM role ARN that can publish to CloudWatch Logs. Rollback: use ec2:DeleteFlowLogsCommand with the FlowLogIds returned from the create call.`,
            passed: false,
            accountId,
            region,
          }),
        );
      } else {
        findings.push(
          this.makeFinding({
            id: `vpc-flow-logs-${vpc.VpcId}`,
            title: `VPC ${label} has flow logs enabled (${region})`,
            description: `Flow logs are enabled for VPC ${vpc.VpcId}.`,
            severity: 'info',
            resourceType: 'AwsEc2Vpc',
            resourceId: vpc.VpcId,
            passed: true,
            accountId,
            region,
          }),
        );
      }
    }

    return findings;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    resourceType?: string;
    resourceId?: string;
    remediation?: string;
    passed: boolean;
    accountId?: string;
    region?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: opts.resourceType || 'AwsEc2Instance',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'EC2/VPC',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

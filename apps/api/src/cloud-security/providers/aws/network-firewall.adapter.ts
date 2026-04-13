import {
  NetworkFirewallClient,
  ListFirewallsCommand,
  DescribeFirewallCommand,
  DescribeLoggingConfigurationCommand,
} from '@aws-sdk/client-network-firewall';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class NetworkFirewallAdapter implements AwsServiceAdapter {
  readonly serviceId = 'network-firewall';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new NetworkFirewallClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const firewalls: { name: string; arn: string }[] = [];
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListFirewallsCommand({ NextToken: nextToken }),
        );

        for (const fw of listRes.Firewalls ?? []) {
          if (fw.FirewallName && fw.FirewallArn) {
            firewalls.push({ name: fw.FirewallName, arn: fw.FirewallArn });
          }
        }

        nextToken = listRes.NextToken;
      } while (nextToken);

      if (firewalls.length === 0) {
        findings.push(
          this.makeFinding({
            id: `network-firewall-none-${region}`,
            title: 'No Network Firewalls found',
            description: `No AWS Network Firewalls are deployed in ${region}.`,
            severity: 'info',
            resourceId: `arn:aws:network-firewall:${region}`,
            evidence: { service: 'Network Firewall', region },
          }),
        );
        return findings;
      }

      for (const fw of firewalls) {
        const descRes = await client.send(
          new DescribeFirewallCommand({ FirewallArn: fw.arn }),
        );

        if (!descRes.Firewall?.FirewallPolicyArn) {
          findings.push(
            this.makeFinding({
              id: `network-firewall-no-policy-${fw.name}`,
              title: 'Firewall has no policy attached',
              description: `Network Firewall "${fw.name}" does not have a firewall policy configured.`,
              severity: 'high',
              resourceId: fw.arn,
              evidence: { service: 'Network Firewall', firewallName: fw.name },
              remediation:
                `Use network-firewall:AssociateFirewallPolicyCommand with FirewallArn set to '${fw.arn}' and FirewallPolicyArn set to the policy ARN. If no policy exists, first create one with network-firewall:CreateFirewallPolicyCommand with FirewallPolicyName and FirewallPolicy containing StatelessDefaultActions and StatefulRuleGroupReferences. Rollback: use network-firewall:AssociateFirewallPolicyCommand to revert to the previous policy ARN.`,
            }),
          );
        }

        const logRes = await client.send(
          new DescribeLoggingConfigurationCommand({ FirewallArn: fw.arn }),
        );

        const logConfigs =
          logRes.LoggingConfiguration?.LogDestinationConfigs ?? [];

        if (logConfigs.length === 0) {
          findings.push(
            this.makeFinding({
              id: `network-firewall-no-logging-${fw.name}`,
              title: 'Firewall logging not configured',
              description: `Network Firewall "${fw.name}" does not have logging configured.`,
              severity: 'medium',
              resourceId: fw.arn,
              evidence: { service: 'Network Firewall', firewallName: fw.name },
              remediation:
                `Use network-firewall:UpdateLoggingConfigurationCommand with FirewallArn set to '${fw.arn}' and LoggingConfiguration.LogDestinationConfigs containing LogType 'ALERT' (or 'FLOW'), LogDestinationType 'CloudWatchLogs' (or 'S3', 'KinesisDataFirehose'), and LogDestination with the destination details (e.g., logGroup for CloudWatch). Rollback: use network-firewall:UpdateLoggingConfigurationCommand with an empty LogDestinationConfigs array.`,
            }),
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(
    params: Omit<SecurityFinding, 'resourceType' | 'createdAt'> & {
      remediation?: string;
    },
  ): SecurityFinding {
    return {
      ...params,
      evidence: { ...(params.evidence ?? {}), findingKey: params.id },
      resourceType: 'AwsNetworkFirewall',
      createdAt: new Date().toISOString(),
    };
  }
}

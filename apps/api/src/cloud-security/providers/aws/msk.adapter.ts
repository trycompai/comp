import { KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class MskAdapter implements AwsServiceAdapter {
  readonly serviceId = 'msk';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new KafkaClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const res = await client.send(
          new ListClustersV2Command({ NextToken: nextToken }),
        );

        for (const cluster of res.ClusterInfoList ?? []) {
          const clusterName = cluster.ClusterName ?? 'unknown';
          const clusterArn = cluster.ClusterArn ?? clusterName;
          const provisioned = cluster.Provisioned;

          if (!provisioned) continue;

          // Check encryption in transit
          const clientBroker =
            provisioned.EncryptionInfo?.EncryptionInTransit?.ClientBroker;

          if (clientBroker === 'TLS') {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Encryption in transit enforced',
                `MSK cluster "${clusterName}" enforces TLS-only encryption in transit`,
                'info',
                { clusterName, clientBroker },
                true,
              ),
            );
          } else if (clientBroker === 'TLS_PLAINTEXT') {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Encryption in transit allows plaintext',
                `MSK cluster "${clusterName}" allows both TLS and plaintext connections`,
                'medium',
                { clusterName, clientBroker },
                false,
                `Use kafka:UpdateSecurityCommand with ClusterArn set to '${clusterArn}', CurrentVersion set to the cluster's current version, and EncryptionInTransit.ClientBroker set to 'TLS'. Rollback: use kafka:UpdateSecurityCommand with ClientBroker set to 'TLS_PLAINTEXT'.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Encryption in transit not enforced',
                `MSK cluster "${clusterName}" does not enforce TLS encryption in transit`,
                'high',
                { clusterName, clientBroker: clientBroker ?? 'NOT_CONFIGURED' },
                false,
                `Use kafka:UpdateSecurityCommand with ClusterArn set to '${clusterArn}', CurrentVersion set to the cluster's current version, and EncryptionInTransit.ClientBroker set to 'TLS'. Rollback: use kafka:UpdateSecurityCommand with ClientBroker set to 'PLAINTEXT'.`,
              ),
            );
          }

          // Check encryption at rest
          const kmsKeyId =
            provisioned.EncryptionInfo?.EncryptionAtRest?.DataVolumeKMSKeyId;

          if (kmsKeyId) {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Custom encryption key configured',
                `MSK cluster "${clusterName}" uses a customer-managed KMS key for encryption at rest`,
                'info',
                { clusterName, kmsKeyId },
                true,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Using default encryption key',
                `MSK cluster "${clusterName}" uses the default AWS-managed encryption key`,
                'medium',
                { clusterName },
                false,
                `[MANUAL] Cannot be auto-fixed. Encryption at rest with a customer-managed KMS key can only be configured at cluster creation time. Create a new MSK cluster using kafka:CreateClusterCommand with EncryptionInfo.EncryptionAtRest.DataVolumeKMSKeyId set to a KMS key ARN, then migrate topics and data.`,
              ),
            );
          }

          // Check broker logging
          const brokerLogs = provisioned.LoggingInfo?.BrokerLogs;
          const hasCloudWatch = brokerLogs?.CloudWatchLogs?.Enabled === true;
          const hasS3 = brokerLogs?.S3?.Enabled === true;
          const hasFirehose = brokerLogs?.Firehose?.Enabled === true;

          if (hasCloudWatch || hasS3 || hasFirehose) {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Broker logging configured',
                `MSK cluster "${clusterName}" has broker logging enabled`,
                'info',
                {
                  clusterName,
                  cloudWatch: hasCloudWatch,
                  s3: hasS3,
                  firehose: hasFirehose,
                },
                true,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                clusterArn,
                'Broker logging not configured',
                `MSK cluster "${clusterName}" does not have any broker log destination configured`,
                'medium',
                { clusterName },
                false,
                `Use kafka:UpdateMonitoringCommand with ClusterArn set to '${clusterArn}', CurrentVersion set to the cluster's current version, and LoggingInfo.BrokerLogs.CloudWatchLogs set to { Enabled: true, LogGroup: '/aws/msk/${clusterName}' }. Alternatively, use S3 or Firehose log destinations. Rollback: use kafka:UpdateMonitoringCommand with CloudWatchLogs.Enabled set to false.`,
              ),
            );
          }
        }

        nextToken = res.NextToken;
      } while (nextToken);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(
    resourceId: string,
    title: string,
    description: string,
    severity: SecurityFinding['severity'],
    evidence?: Record<string, unknown>,
    passed?: boolean,
    remediation?: string,
  ): SecurityFinding {
    const id = `msk-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsMskCluster',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'MSK', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

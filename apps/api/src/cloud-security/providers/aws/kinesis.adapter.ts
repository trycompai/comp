import {
  KinesisClient,
  ListStreamsCommand,
  DescribeStreamSummaryCommand,
} from '@aws-sdk/client-kinesis';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class KinesisAdapter implements AwsServiceAdapter {
  readonly serviceId = 'kinesis';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new KinesisClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const streamNames: string[] = [];
      let exclusiveStartStreamName: string | undefined;

      do {
        const listRes = await client.send(
          new ListStreamsCommand({
            ExclusiveStartStreamName: exclusiveStartStreamName,
          }),
        );

        const names = listRes.StreamNames ?? [];
        streamNames.push(...names);

        if (listRes.HasMoreStreams && names.length > 0) {
          exclusiveStartStreamName = names[names.length - 1];
        } else {
          break;
        }
      } while (true);

      if (streamNames.length === 0) return findings;

      for (const streamName of streamNames) {
        const descRes = await client.send(
          new DescribeStreamSummaryCommand({ StreamName: streamName }),
        );

        const summary = descRes.StreamDescriptionSummary;
        if (!summary) continue;

        const streamArn =
          summary.StreamARN ??
          `arn:aws:kinesis:${region}:stream/${streamName}`;

        if (
          !summary.EncryptionType ||
          summary.EncryptionType === 'NONE'
        ) {
          findings.push(
            this.makeFinding({
              id: `kinesis-not-encrypted-${streamName}`,
              title: 'Stream not encrypted',
              description: `Kinesis stream "${streamName}" does not have server-side encryption enabled.`,
              severity: 'high',
              resourceId: streamArn,
              evidence: {
                service: 'Kinesis',
                streamName,
                encryptionType: summary.EncryptionType ?? 'NONE',
              },
              remediation:
                `Use kinesis:StartStreamEncryptionCommand with StreamName set to '${streamName}', EncryptionType set to 'KMS', and KeyId set to a KMS key ARN or alias (e.g., 'alias/aws/kinesis' for AWS-managed key, or a CMK ARN). Rollback: use kinesis:StopStreamEncryptionCommand with StreamName set to '${streamName}', EncryptionType set to 'KMS', and the same KeyId.`,
            }),
          );
        } else {
          findings.push(
            this.makeFinding({
              id: `kinesis-encrypted-${streamName}`,
              title: 'Stream encrypted',
              description: `Kinesis stream "${streamName}" has ${summary.EncryptionType} encryption enabled.`,
              severity: 'info',
              resourceId: streamArn,
              evidence: {
                service: 'Kinesis',
                streamName,
                encryptionType: summary.EncryptionType,
              },
              passed: true,
            }),
          );
        }

        const enhancedMetrics = summary.EnhancedMonitoring ?? [];
        const hasShardMetrics = enhancedMetrics.some(
          (m) => m.ShardLevelMetrics && m.ShardLevelMetrics.length > 0,
        );

        if (!hasShardMetrics) {
          findings.push(
            this.makeFinding({
              id: `kinesis-no-enhanced-monitoring-${streamName}`,
              title: 'Enhanced monitoring not enabled',
              description: `Kinesis stream "${streamName}" does not have shard-level enhanced monitoring enabled.`,
              severity: 'low',
              resourceId: streamArn,
              evidence: { service: 'Kinesis', streamName },
              remediation:
                `Use kinesis:EnableEnhancedMonitoringCommand with StreamName set to '${streamName}' and ShardLevelMetrics set to ['ALL'] (or specific metrics like 'IncomingBytes', 'OutgoingBytes'). Rollback: use kinesis:DisableEnhancedMonitoringCommand with the same StreamName and ShardLevelMetrics.`,
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
      resourceType: 'AwsKinesisStream',
      evidence: { ...params.evidence, findingKey: params.id },
      createdAt: new Date().toISOString(),
    };
  }
}

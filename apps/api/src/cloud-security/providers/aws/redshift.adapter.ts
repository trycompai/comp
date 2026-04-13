import {
  DescribeClustersCommand,
  DescribeLoggingStatusCommand,
  RedshiftClient,
} from '@aws-sdk/client-redshift';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class RedshiftAdapter implements AwsServiceAdapter {
  readonly serviceId = 'redshift';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new RedshiftClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;

      do {
        const listRes = await client.send(
          new DescribeClustersCommand({ Marker: marker }),
        );

        for (const cluster of listRes.Clusters ?? []) {
          const clusterId = cluster.ClusterIdentifier ?? 'unknown';

          if (cluster.Encrypted !== true) {
            findings.push(
              this.makeFinding(clusterId, 'Redshift cluster is not encrypted', `Cluster "${clusterId}" does not have encryption at rest enabled`, 'high', { encrypted: cluster.Encrypted }, false, `[MANUAL] Cannot be auto-fixed. Redshift cluster encryption requires cluster recreation. To fix: create a new encrypted cluster using redshift:CreateClusterCommand with Encrypted set to true, migrate data, then delete the old cluster.`),
            );
          } else {
            findings.push(
              this.makeFinding(clusterId, 'Redshift cluster encryption enabled', `Cluster "${clusterId}" has encryption at rest enabled`, 'info', { encrypted: true }, true),
            );
          }

          if (cluster.PubliclyAccessible === true) {
            findings.push(
              this.makeFinding(clusterId, 'Redshift cluster is publicly accessible', `Cluster "${clusterId}" is configured with public access`, 'critical', { publiclyAccessible: true }, false, `Use redshift:ModifyClusterCommand with ClusterIdentifier and PubliclyAccessible set to false. Rollback by setting PubliclyAccessible to true.`),
            );
          } else {
            findings.push(
              this.makeFinding(clusterId, 'Redshift cluster is not publicly accessible', `Cluster "${clusterId}" is not publicly accessible`, 'info', { publiclyAccessible: false }, true),
            );
          }

          try {
            const logRes = await client.send(
              new DescribeLoggingStatusCommand({
                ClusterIdentifier: clusterId,
              }),
            );

            if (logRes.LoggingEnabled !== true) {
              findings.push(
                this.makeFinding(clusterId, 'Redshift audit logging is disabled', `Cluster "${clusterId}" does not have audit logging enabled`, 'medium', { loggingEnabled: false }, false, `Use redshift:EnableLoggingCommand with ClusterIdentifier and BucketName for the S3 logging bucket. Rollback by calling redshift:DisableLoggingCommand.`),
              );
            } else {
              findings.push(
                this.makeFinding(clusterId, 'Redshift audit logging is enabled', `Cluster "${clusterId}" has audit logging enabled`, 'info', { loggingEnabled: true }, true),
              );
            }
          } catch (error: unknown) {
            const msg =
              error instanceof Error ? error.message : String(error);
            if (!msg.includes('AccessDenied')) throw error;
          }
        }

        marker = listRes.Marker;
      } while (marker);
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
    const id = `redshift-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsRedshiftCluster',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

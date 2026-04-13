import {
  EMRClient,
  ListClustersCommand,
  DescribeClusterCommand,
} from '@aws-sdk/client-emr';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class EmrAdapter implements AwsServiceAdapter {
  readonly serviceId = 'emr';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new EMRClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;

      do {
        const listRes = await client.send(
          new ListClustersCommand({
            ClusterStates: [
              'STARTING',
              'BOOTSTRAPPING',
              'RUNNING',
              'WAITING',
            ],
            Marker: marker,
          }),
        );

        for (const clusterSummary of listRes.Clusters ?? []) {
          const clusterId = clusterSummary.Id;
          if (!clusterId) continue;

          const descRes = await client.send(
            new DescribeClusterCommand({ ClusterId: clusterId }),
          );

          const cluster = descRes.Cluster;
          if (!cluster) continue;

          const clusterName = cluster.Name ?? clusterId;
          const resourceId =
            `arn:aws:elasticmapreduce:${region}:cluster/${clusterId}`;

          // Check security configuration
          if (!cluster.SecurityConfiguration) {
            findings.push(
              this.makeFinding(resourceId, 'No security configuration applied', `EMR cluster "${clusterName}" (${clusterId}) does not have a security configuration applied`, 'medium', { clusterId, clusterName, securityConfiguration: null }, false, `[MANUAL] Cannot be auto-fixed on a running cluster. Security configurations can only be set at cluster launch time. Create a security configuration using emr:CreateSecurityConfigurationCommand with Name and SecurityConfiguration (JSON string with EncryptionConfiguration, AuthenticationConfiguration). Then terminate the cluster using emr:TerminateJobFlowsCommand and relaunch with emr:RunJobFlowCommand specifying SecurityConfiguration.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'Security configuration applied', `EMR cluster "${clusterName}" (${clusterId}) has a security configuration applied`, 'info', { clusterId, clusterName, securityConfiguration: cluster.SecurityConfiguration }, true),
            );
          }

          // Check logging configuration
          if (!cluster.LogUri) {
            findings.push(
              this.makeFinding(resourceId, 'Logging not configured', `EMR cluster "${clusterName}" (${clusterId}) does not have logging configured`, 'medium', { clusterId, clusterName, logUri: null }, false, `[MANUAL] Cannot be auto-fixed on a running cluster. Logging must be configured at cluster launch time. Use emr:RunJobFlowCommand with LogUri set to an S3 path (e.g., 's3://bucket-name/emr-logs/') when creating a new cluster. The current cluster must be terminated and relaunched with logging enabled.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'Logging configured', `EMR cluster "${clusterName}" (${clusterId}) has logging configured`, 'info', { clusterId, clusterName, logUri: cluster.LogUri }, true),
            );
          }

          // Check termination protection
          if (cluster.TerminationProtected !== true) {
            findings.push(
              this.makeFinding(resourceId, 'Termination protection disabled', `EMR cluster "${clusterName}" (${clusterId}) does not have termination protection enabled`, 'low', { clusterId, clusterName, terminationProtected: cluster.TerminationProtected }, false, `Use emr:SetTerminationProtectionCommand with JobFlowIds set to ['${clusterId}'] and TerminationProtected set to true. Rollback: use emr:SetTerminationProtectionCommand with TerminationProtected set to false.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'Termination protection enabled', `EMR cluster "${clusterName}" (${clusterId}) has termination protection enabled`, 'info', { clusterId, clusterName, terminationProtected: true }, true),
            );
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
    const id = `emr-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsEmrCluster',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'EMR', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

import {
  ElastiCacheClient,
  DescribeReplicationGroupsCommand,
  DescribeCacheClustersCommand,
} from '@aws-sdk/client-elasticache';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class ElastiCacheAdapter implements AwsServiceAdapter {
  readonly serviceId = 'elasticache';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
    accountId,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ElastiCacheClient({ credentials, region });

    try {
      const rgFindings = await this.checkReplicationGroups(
        client,
        region,
        accountId,
      );

      if (rgFindings.length > 0) {
        return rgFindings;
      }

      // Fall back to individual cache clusters if no replication groups
      return await this.checkCacheClusters(client, region, accountId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }
  }

  private async checkReplicationGroups(
    client: ElastiCacheClient,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    let marker: string | undefined;

    do {
      const resp = await client.send(
        new DescribeReplicationGroupsCommand({ Marker: marker }),
      );

      for (const group of resp.ReplicationGroups ?? []) {
        if (!group.ReplicationGroupId) continue;

        const groupId = group.ReplicationGroupId;
        const resourceId = group.ARN ?? groupId;

        if (group.TransitEncryptionEnabled !== true) {
          findings.push(
            this.makeFinding({
              id: `elasticache-no-transit-encryption-${groupId}`,
              title: `ElastiCache replication group "${groupId}" has encryption in transit disabled (${region})`,
              description: `Replication group ${groupId} does not have encryption in transit enabled. Data transmitted between nodes and clients is not encrypted.`,
              severity: 'high',
              resourceId,
              remediation: `[MANUAL] Cannot be auto-fixed. ElastiCache in-transit encryption requires recreating the replication group. To fix: create a new replication group with TransitEncryptionEnabled set to true, migrate data, then delete the old group.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }

        if (group.AtRestEncryptionEnabled !== true) {
          findings.push(
            this.makeFinding({
              id: `elasticache-no-rest-encryption-${groupId}`,
              title: `ElastiCache replication group "${groupId}" has encryption at rest disabled (${region})`,
              description: `Replication group ${groupId} does not have encryption at rest enabled. Cached data stored on disk is not encrypted.`,
              severity: 'high',
              resourceId,
              remediation: `[MANUAL] Cannot be auto-fixed. ElastiCache at-rest encryption requires recreating the replication group. To fix: create a new replication group with AtRestEncryptionEnabled set to true, migrate data, then delete the old group.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }

        if (group.AuthTokenEnabled !== true) {
          findings.push(
            this.makeFinding({
              id: `elasticache-no-auth-token-${groupId}`,
              title: `ElastiCache replication group "${groupId}" has AUTH token not enabled (${region})`,
              description: `Replication group ${groupId} does not require an AUTH token for client connections. Any client with network access can connect without authentication.`,
              severity: 'medium',
              resourceId,
              remediation: `Use elasticache:ModifyReplicationGroupCommand with ReplicationGroupId and AuthToken to set a new AUTH token, and AuthTokenUpdateStrategy set to SET. Requires TransitEncryptionEnabled to be true. Rollback by calling elasticache:ModifyReplicationGroupCommand with AuthTokenUpdateStrategy set to DELETE.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }
      }

      marker = resp.Marker;
    } while (marker);

    return findings;
  }

  private async checkCacheClusters(
    client: ElastiCacheClient,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    let marker: string | undefined;

    do {
      const resp = await client.send(
        new DescribeCacheClustersCommand({ Marker: marker }),
      );

      for (const cluster of resp.CacheClusters ?? []) {
        if (!cluster.CacheClusterId) continue;

        const clusterId = cluster.CacheClusterId;
        const resourceId = cluster.ARN ?? clusterId;

        if (cluster.TransitEncryptionEnabled !== true) {
          findings.push(
            this.makeFinding({
              id: `elasticache-cluster-no-transit-encryption-${clusterId}`,
              title: `ElastiCache cluster "${clusterId}" has encryption in transit disabled (${region})`,
              description: `Cache cluster ${clusterId} does not have encryption in transit enabled. Data transmitted between the cluster and clients is not encrypted.`,
              severity: 'high',
              resourceId,
              remediation: `[MANUAL] Cannot be auto-fixed. ElastiCache in-transit encryption requires recreating the replication group. To fix: create a new replication group with TransitEncryptionEnabled set to true, migrate data, then delete the old group.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }

        if (cluster.AtRestEncryptionEnabled !== true) {
          findings.push(
            this.makeFinding({
              id: `elasticache-cluster-no-rest-encryption-${clusterId}`,
              title: `ElastiCache cluster "${clusterId}" has encryption at rest disabled (${region})`,
              description: `Cache cluster ${clusterId} does not have encryption at rest enabled. Cached data stored on disk is not encrypted.`,
              severity: 'high',
              resourceId,
              remediation: `[MANUAL] Cannot be auto-fixed. ElastiCache at-rest encryption requires recreating the replication group. To fix: create a new replication group with AtRestEncryptionEnabled set to true, migrate data, then delete the old group.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }
      }

      marker = resp.Marker;
    } while (marker);

    return findings;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
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
      resourceType: 'AwsElastiCacheCluster',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'ElastiCache',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

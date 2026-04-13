import {
  ECSClient,
  ListTaskDefinitionsCommand,
  DescribeTaskDefinitionCommand,
} from '@aws-sdk/client-ecs';
import {
  EKSClient,
  ListClustersCommand,
  DescribeClusterCommand,
} from '@aws-sdk/client-eks';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const EXPECTED_EKS_LOG_TYPES = [
  'api',
  'audit',
  'authenticator',
  'controllerManager',
  'scheduler',
];

export class EcsEksAdapter implements AwsServiceAdapter {
  readonly serviceId = 'ecs-eks';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      await this.scanEcs({ credentials, region, findings });
      await this.scanEks({ credentials, region, findings });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private async scanEcs({
    credentials,
    region,
    findings,
  }: {
    credentials: AwsCredentials;
    region: string;
    findings: SecurityFinding[];
  }): Promise<void> {
    const client = new ECSClient({ credentials, region });

    let nextToken: string | undefined;
    let taskDefArns: string[] = [];

    do {
      const resp = await client.send(
        new ListTaskDefinitionsCommand({
          status: 'ACTIVE',
          nextToken,
        }),
      );

      taskDefArns = taskDefArns.concat(resp.taskDefinitionArns ?? []);
      nextToken = resp.nextToken;

      // Limit to first 50 task definitions
      if (taskDefArns.length >= 50) {
        taskDefArns = taskDefArns.slice(0, 50);
        break;
      }
    } while (nextToken);

    for (const taskDefArn of taskDefArns) {
      try {
        const resp = await client.send(
          new DescribeTaskDefinitionCommand({ taskDefinition: taskDefArn }),
        );

        const containers =
          resp.taskDefinition?.containerDefinitions ?? [];

        for (const container of containers) {
          if (container.privileged === true) {
            findings.push(
              this.makeFinding({
                resourceId: taskDefArn,
                resourceType: 'AwsEcsTaskDefinition',
                title: `Container ${container.name ?? 'unknown'} runs in privileged mode`,
                description: `ECS task definition ${taskDefArn} has container "${container.name}" running in privileged mode. Privileged containers have full access to the host.`,
                severity: 'high',
                remediation:
                  '[MANUAL] Cannot be auto-fixed for existing running tasks. Register a new task definition revision using ecs:RegisterTaskDefinitionCommand with the container definition\'s privileged field set to false, then update the service using ecs:UpdateServiceCommand with the new taskDefinition ARN. Rollback: register another revision with privileged set to true and update the service.',
                evidence: {
                  containerName: container.name,
                  privileged: true,
                },
              }),
            );
          }
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : String(error);
        if (msg.includes('AccessDenied')) return;
      }
    }
  }

  private async scanEks({
    credentials,
    region,
    findings,
  }: {
    credentials: AwsCredentials;
    region: string;
    findings: SecurityFinding[];
  }): Promise<void> {
    const client = new EKSClient({ credentials, region });

    let nextToken: string | undefined;

    do {
      const resp = await client.send(
        new ListClustersCommand({ nextToken }),
      );

      const clusterNames = resp.clusters ?? [];

      for (const clusterName of clusterNames) {
        try {
          const descResp = await client.send(
            new DescribeClusterCommand({ name: clusterName }),
          );

          const cluster = descResp.cluster;
          if (!cluster) continue;

          const clusterArn = cluster.arn ?? clusterName;

          // Check cluster logging
          const clusterLogging = cluster.logging?.clusterLogging ?? [];
          const enabledTypes = new Set<string>();

          for (const logSetup of clusterLogging) {
            if (logSetup.enabled) {
              for (const logType of logSetup.types ?? []) {
                enabledTypes.add(logType);
              }
            }
          }

          const disabledTypes = EXPECTED_EKS_LOG_TYPES.filter(
            (t) => !enabledTypes.has(t),
          );

          if (disabledTypes.length > 0) {
            findings.push(
              this.makeFinding({
                resourceId: clusterArn,
                resourceType: 'AwsEksCluster',
                title: 'EKS cluster logging incomplete',
                description: `EKS cluster ${clusterName} does not have all recommended log types enabled. Missing: ${disabledTypes.join(', ')}.`,
                severity: 'medium',
                remediation:
                  `Use eks:UpdateClusterConfigCommand with name set to '${clusterName}' and logging.clusterLogging set to [{ types: ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'], enabled: true }]. Rollback: use eks:UpdateClusterConfigCommand with enabled set to false for the added log types.`,
                evidence: {
                  enabledTypes: [...enabledTypes],
                  disabledTypes,
                },
              }),
            );
          }

          // Check public API endpoint
          const vpcConfig = cluster.resourcesVpcConfig;
          if (vpcConfig?.endpointPublicAccess === true) {
            const cidrs = vpcConfig.publicAccessCidrs ?? [];
            if (cidrs.includes('0.0.0.0/0')) {
              findings.push(
                this.makeFinding({
                  resourceId: clusterArn,
                  resourceType: 'AwsEksCluster',
                  title: 'EKS API publicly accessible',
                  description: `EKS cluster ${clusterName} has its API endpoint publicly accessible from any IP address (0.0.0.0/0).`,
                  severity: 'high',
                  remediation:
                    `Use eks:UpdateClusterConfigCommand with name set to '${clusterName}' and resourcesVpcConfig.endpointPublicAccess set to false (or keep true and set publicAccessCidrs to specific CIDR ranges instead of '0.0.0.0/0'). Ensure endpointPrivateAccess is set to true if disabling public access. Rollback: use eks:UpdateClusterConfigCommand with endpointPublicAccess set to true and publicAccessCidrs set to ['0.0.0.0/0'].`,
                  evidence: {
                    endpointPublicAccess: true,
                    publicAccessCidrs: cidrs,
                  },
                }),
              );
            }
          }
        } catch (error) {
          const msg =
            error instanceof Error ? error.message : String(error);
          if (msg.includes('AccessDenied')) return;
        }
      }

      nextToken = resp.nextToken;
    } while (nextToken);
  }

  private makeFinding(params: {
    resourceId: string;
    resourceType: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    remediation?: string;
    evidence?: Record<string, unknown>;
    passed?: boolean;
  }): SecurityFinding {
    const id = `ecs-eks-${params.resourceId}-${params.title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      remediation: params.remediation,
      evidence: { ...params.evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed: params.passed,
    };
  }
}

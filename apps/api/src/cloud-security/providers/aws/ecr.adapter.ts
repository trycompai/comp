import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class EcrAdapter implements AwsServiceAdapter {
  readonly serviceId = 'ecr';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ECRClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const response = await client.send(
          new DescribeRepositoriesCommand({ nextToken }),
        );

        for (const repo of response.repositories ?? []) {
          const repoName = repo.repositoryName ?? 'unknown';
          const repoArn =
            repo.repositoryArn ?? `arn:aws:ecr:${region}:repo/${repoName}`;

          if (repo.imageScanningConfiguration?.scanOnPush !== true) {
            findings.push(
              this.makeFinding({
                id: `ecr-scan-on-push-disabled-${repoName}`,
                title: `ECR scan on push disabled for ${repoName}`,
                description: `Repository ${repoName} does not have image scan on push enabled.`,
                severity: 'medium',
                resourceId: repoArn,
                remediation: `Use ecr:PutImageScanningConfigurationCommand with repositoryName set to "${repoName}" and imageScanningConfiguration.scanOnPush set to true. Rollback by setting scanOnPush to false.`,
              }),
            );
          } else {
            findings.push(
              this.makeFinding({
                id: `ecr-scan-on-push-enabled-${repoName}`,
                title: `ECR scan on push enabled for ${repoName}`,
                description: `Repository ${repoName} has image scan on push enabled.`,
                severity: 'info',
                resourceId: repoArn,
                passed: true,
              }),
            );
          }

          if (repo.imageTagMutability !== 'IMMUTABLE') {
            findings.push(
              this.makeFinding({
                id: `ecr-tag-mutable-${repoName}`,
                title: `ECR image tags mutable for ${repoName}`,
                description: `Repository ${repoName} allows image tag overwriting. Tags should be immutable.`,
                severity: 'low',
                resourceId: repoArn,
                remediation: `Use ecr:PutImageTagMutabilityCommand with repositoryName set to "${repoName}" and imageTagMutability set to 'IMMUTABLE'. Rollback by setting imageTagMutability to 'MUTABLE'.`,
              }),
            );
          } else {
            findings.push(
              this.makeFinding({
                id: `ecr-tag-immutable-${repoName}`,
                title: `ECR image tags immutable for ${repoName}`,
                description: `Repository ${repoName} has immutable image tags configured.`,
                severity: 'info',
                resourceId: repoArn,
                passed: true,
              }),
            );
          }
        }

        nextToken = response.nextToken;
      } while (nextToken);
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
      resourceType: 'AwsEcrRepository',
      createdAt: new Date().toISOString(),
    };
  }
}

import {
  CodeBuildClient,
  ListProjectsCommand,
  BatchGetProjectsCommand,
} from '@aws-sdk/client-codebuild';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class CodeBuildAdapter implements AwsServiceAdapter {
  readonly serviceId = 'codebuild';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new CodeBuildClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const projectNames: string[] = [];
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListProjectsCommand({ nextToken }),
        );
        if (listRes.projects) {
          projectNames.push(...listRes.projects);
        }
        nextToken = listRes.nextToken;
      } while (nextToken);

      if (projectNames.length === 0) return findings;

      for (let i = 0; i < projectNames.length; i += 100) {
        const batch = projectNames.slice(i, i + 100);
        const batchRes = await client.send(
          new BatchGetProjectsCommand({ names: batch }),
        );

        for (const project of batchRes.projects ?? []) {
          const name = project.name ?? 'unknown';
          const arn =
            project.arn ?? `arn:aws:codebuild:${region}:project/${name}`;

          if (
            !project.encryptionKey ||
            project.encryptionKey.includes('aws/codebuild')
          ) {
            findings.push(
              this.makeFinding({
                id: `codebuild-default-encryption-${name}`,
                title: 'Using default encryption key',
                description: `CodeBuild project "${name}" uses the default AWS-managed encryption key instead of a customer-managed KMS key.`,
                severity: 'low',
                resourceId: arn,
                evidence: { service: 'CodeBuild', projectName: name },
                remediation: `Use codebuild:UpdateProjectCommand with name set to "${name}" and encryptionKey set to a customer-managed KMS key ARN (arn:aws:kms:region:account:key/key-id). Rollback: use codebuild:UpdateProjectCommand with encryptionKey set to the default 'aws/codebuild' key ARN.`,
              }),
            );
          }

          if (project.environment?.privilegedMode === true) {
            findings.push(
              this.makeFinding({
                id: `codebuild-privileged-mode-${name}`,
                title: 'Privileged mode enabled',
                description: `CodeBuild project "${name}" has privileged mode enabled, granting the build container elevated permissions.`,
                severity: 'medium',
                resourceId: arn,
                evidence: { service: 'CodeBuild', projectName: name },
                remediation: `Use codebuild:UpdateProjectCommand with name set to "${name}" and environment.privilegedMode set to false. Rollback: use codebuild:UpdateProjectCommand with environment.privilegedMode set to true. [MANUAL] Verify that the project does not require Docker-in-Docker builds before disabling, as this will break Docker image builds.`,
              }),
            );
          }

          const cwEnabled =
            project.logsConfig?.cloudWatchLogs?.status === 'ENABLED';
          const s3Enabled = project.logsConfig?.s3Logs?.status === 'ENABLED';

          if (!cwEnabled && !s3Enabled) {
            findings.push(
              this.makeFinding({
                id: `codebuild-no-logging-${name}`,
                title: 'Build logging not configured',
                description: `CodeBuild project "${name}" has neither CloudWatch nor S3 logging enabled.`,
                severity: 'medium',
                resourceId: arn,
                evidence: { service: 'CodeBuild', projectName: name },
                remediation: `Use codebuild:UpdateProjectCommand with name set to "${name}" and logsConfig.cloudWatchLogs set to { status: 'ENABLED', groupName: '/aws/codebuild/${name}' }. Alternatively, set logsConfig.s3Logs to { status: 'ENABLED', location: 'bucket-name/prefix' }. Rollback: use codebuild:UpdateProjectCommand with logsConfig.cloudWatchLogs.status set to 'DISABLED'.`,
              }),
            );
          }
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
      resourceType: 'AwsCodeBuildProject',
      evidence: { ...params.evidence, findingKey: params.id },
      createdAt: new Date().toISOString(),
    };
  }
}

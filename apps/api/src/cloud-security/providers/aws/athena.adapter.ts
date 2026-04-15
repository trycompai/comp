import {
  AthenaClient,
  ListWorkGroupsCommand,
  GetWorkGroupCommand,
} from '@aws-sdk/client-athena';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class AthenaAdapter implements AwsServiceAdapter {
  readonly serviceId = 'athena';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new AthenaClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListWorkGroupsCommand({ NextToken: nextToken }),
        );

        for (const wgSummary of listRes.WorkGroups ?? []) {
          const wgName = wgSummary.Name ?? 'unknown';

          // Skip the default "primary" workgroup — only check user-created workgroups
          if (wgName === 'primary') continue;

          const resourceId = `arn:aws:athena:${region}:workgroup/${wgName}`;

          const descRes = await client.send(
            new GetWorkGroupCommand({ WorkGroup: wgName }),
          );

          const config = descRes.WorkGroup?.Configuration;

          // Check query result encryption
          const encryptionConfig =
            config?.ResultConfiguration?.EncryptionConfiguration;

          if (!encryptionConfig) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Query results not encrypted',
                `Athena workgroup "${wgName}" does not have encryption configured for query results`,
                'medium',
                { workGroupName: wgName, encryptionConfiguration: null },
                false,
                `Use athena:UpdateWorkGroupCommand with WorkGroup set to '${wgName}' and ConfigurationUpdates.ResultConfigurationUpdates.EncryptionConfiguration set to { EncryptionOption: 'SSE_KMS', KmsKey: '<kms-key-arn>' } (or 'SSE_S3' for S3-managed encryption). Rollback: use athena:UpdateWorkGroupCommand with RemoveEncryptionConfiguration set to true.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Query results encryption enabled',
                `Athena workgroup "${wgName}" has encryption configured for query results`,
                'info',
                {
                  workGroupName: wgName,
                  encryptionOption: encryptionConfig.EncryptionOption,
                },
                true,
              ),
            );
          }

          // Check workgroup configuration enforcement
          if (config?.EnforceWorkGroupConfiguration !== true) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Workgroup configuration not enforced (users can override)',
                `Athena workgroup "${wgName}" does not enforce its configuration, allowing users to override settings`,
                'medium',
                {
                  workGroupName: wgName,
                  enforceWorkGroupConfiguration:
                    config?.EnforceWorkGroupConfiguration,
                },
                false,
                `Use athena:UpdateWorkGroupCommand with WorkGroup set to '${wgName}' and ConfigurationUpdates.EnforceWorkGroupConfiguration set to true. This prevents users from overriding workgroup settings at query time. Rollback: use athena:UpdateWorkGroupCommand with EnforceWorkGroupConfiguration set to false.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'Workgroup configuration enforced',
                `Athena workgroup "${wgName}" enforces its configuration`,
                'info',
                { workGroupName: wgName, enforceWorkGroupConfiguration: true },
                true,
              ),
            );
          }
        }

        nextToken = listRes.NextToken;
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
    const id = `athena-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsAthenaWorkGroup',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'Athena', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

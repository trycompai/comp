import {
  GlueClient,
  GetDataCatalogEncryptionSettingsCommand,
  GetDatabasesCommand,
  GetJobsCommand,
} from '@aws-sdk/client-glue';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class GlueAdapter implements AwsServiceAdapter {
  readonly serviceId = 'glue';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new GlueClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are any Glue databases or jobs
    try {
      const dbResp = await client.send(
        new GetDatabasesCommand({ MaxResults: 1 }),
      );
      const hasDBs = (dbResp.DatabaseList ?? []).length > 0;

      if (!hasDBs) {
        const jobsResp = await client.send(
          new GetJobsCommand({ MaxResults: 1 }),
        );
        const hasJobs = (jobsResp.Jobs ?? []).length > 0;

        if (!hasJobs) return [];
      }
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      // Check Data Catalog encryption settings
      const catalogRes = await client.send(
        new GetDataCatalogEncryptionSettingsCommand({}),
      );

      const encSettings =
        catalogRes.DataCatalogEncryptionSettings?.EncryptionAtRest;
      const catalogId = `arn:aws:glue:${region}:catalog`;

      if (encSettings?.CatalogEncryptionMode === 'DISABLED') {
        findings.push(
          this.makeFinding(catalogId, 'AwsGlueCatalog', 'Data catalog not encrypted', `Glue Data Catalog in ${region} does not have encryption at rest enabled`, 'medium', { catalogEncryptionMode: encSettings.CatalogEncryptionMode }, false, `Use glue:PutDataCatalogEncryptionSettingsCommand with DataCatalogEncryptionSettings.EncryptionAtRest.CatalogEncryptionMode set to 'SSE-KMS' and SseAwsKmsKeyId set to a KMS key ARN. Rollback: use glue:PutDataCatalogEncryptionSettingsCommand with CatalogEncryptionMode set to 'DISABLED'. Note: disabling encryption does not decrypt existing encrypted objects.`),
        );
      } else {
        findings.push(
          this.makeFinding(catalogId, 'AwsGlueCatalog', 'Data catalog encryption enabled', `Glue Data Catalog in ${region} has encryption at rest enabled (${encSettings?.CatalogEncryptionMode})`, 'info', { catalogEncryptionMode: encSettings?.CatalogEncryptionMode }, true),
        );
      }

      const connPwdEnc =
        catalogRes.DataCatalogEncryptionSettings?.ConnectionPasswordEncryption;

      if (connPwdEnc?.ReturnConnectionPasswordEncrypted !== true) {
        findings.push(
          this.makeFinding(catalogId, 'AwsGlueCatalog', 'Connection passwords not encrypted', `Glue Data Catalog in ${region} does not encrypt connection passwords`, 'medium', { returnConnectionPasswordEncrypted: connPwdEnc?.ReturnConnectionPasswordEncrypted }, false, `Use glue:PutDataCatalogEncryptionSettingsCommand with DataCatalogEncryptionSettings.ConnectionPasswordEncryption.ReturnConnectionPasswordEncrypted set to true and AwsKmsKeyId set to a KMS key ARN. Rollback: use glue:PutDataCatalogEncryptionSettingsCommand with ReturnConnectionPasswordEncrypted set to false.`),
        );
      } else {
        findings.push(
          this.makeFinding(catalogId, 'AwsGlueCatalog', 'Connection passwords encrypted', `Glue Data Catalog in ${region} encrypts connection passwords`, 'info', { returnConnectionPasswordEncrypted: true }, true),
        );
      }

      // Check Glue Jobs for security configuration
      let nextToken: string | undefined;

      do {
        const jobsRes = await client.send(
          new GetJobsCommand({ NextToken: nextToken }),
        );

        for (const job of jobsRes.Jobs ?? []) {
          const jobName = job.Name ?? 'unknown';
          const resourceId = `arn:aws:glue:${region}:job/${jobName}`;
          const hasEncryptionArg =
            job.DefaultArguments?.['--encryption-type'] !== undefined;

          if (!job.SecurityConfiguration && !hasEncryptionArg) {
            findings.push(
              this.makeFinding(resourceId, 'AwsGlueJob', 'Glue job has no security configuration', `Glue job "${jobName}" does not have a security configuration or encryption type set`, 'low', { jobName, securityConfiguration: null }, false, `First create a security configuration using glue:CreateSecurityConfigurationCommand with Name and EncryptionConfiguration (S3Encryption, CloudWatchEncryption, JobBookmarksEncryption). Then use glue:UpdateJobCommand with JobName set to '${jobName}' and JobUpdate.SecurityConfiguration set to the security configuration name. Rollback: use glue:UpdateJobCommand with SecurityConfiguration set to empty string.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'AwsGlueJob', 'Glue job has security configuration', `Glue job "${jobName}" has a security configuration applied`, 'info', { jobName, securityConfiguration: job.SecurityConfiguration ?? null }, true),
            );
          }
        }

        nextToken = jobsRes.NextToken;
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
    resourceType: string,
    title: string,
    description: string,
    severity: SecurityFinding['severity'],
    evidence?: Record<string, unknown>,
    passed?: boolean,
    remediation?: string,
  ): SecurityFinding {
    const id = `glue-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType,
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'Glue', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

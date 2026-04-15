import { EFSClient, DescribeFileSystemsCommand } from '@aws-sdk/client-efs';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class EfsAdapter implements AwsServiceAdapter {
  readonly serviceId = 'efs';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new EFSClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;

      do {
        const res = await client.send(
          new DescribeFileSystemsCommand({ Marker: marker }),
        );

        for (const fs of res.FileSystems ?? []) {
          const resourceId = fs.FileSystemId ?? 'unknown';

          if (fs.Encrypted !== true) {
            findings.push(
              this.makeFinding(
                resourceId,
                'EFS not encrypted at rest',
                `EFS file system "${resourceId}" is not encrypted at rest`,
                'high',
                { fileSystemId: resourceId, encrypted: false },
                undefined,
                `[MANUAL] Cannot be auto-fixed. EFS encryption at rest must be set at file system creation time and cannot be changed afterward. To fix: create a new encrypted EFS file system using efs:CreateFileSystemCommand with Encrypted set to true and optionally KmsKeyId for a customer-managed CMK, migrate data from the unencrypted file system using AWS DataSync, update all mount targets and application references to point to the new file system, then delete the old unencrypted file system using efs:DeleteFileSystemCommand.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                resourceId,
                'EFS encrypted at rest',
                `EFS file system "${resourceId}" is encrypted at rest`,
                'info',
                { fileSystemId: resourceId, encrypted: true },
                true,
              ),
            );
          }
        }

        marker = res.NextMarker;
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
    const id = `efs-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsEfsFileSystem',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'EFS', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

import {
  SageMakerClient,
  ListNotebookInstancesCommand,
  DescribeNotebookInstanceCommand,
} from '@aws-sdk/client-sagemaker';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class SageMakerAdapter implements AwsServiceAdapter {
  readonly serviceId = 'sagemaker';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new SageMakerClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListNotebookInstancesCommand({ NextToken: nextToken }),
        );

        for (const nb of listRes.NotebookInstances ?? []) {
          const notebookName = nb.NotebookInstanceName ?? 'unknown';
          const notebookArn = nb.NotebookInstanceArn ?? notebookName;

          const descRes = await client.send(
            new DescribeNotebookInstanceCommand({
              NotebookInstanceName: notebookName,
            }),
          );

          // Check KMS encryption
          if (descRes.KmsKeyId) {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Notebook encrypted with CMK',
                `SageMaker notebook "${notebookName}" is encrypted with a customer-managed KMS key`,
                'info',
                { notebookName, kmsKeyId: descRes.KmsKeyId },
                true,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Notebook not encrypted with CMK',
                `SageMaker notebook "${notebookName}" is not encrypted with a customer-managed KMS key`,
                'medium',
                { notebookName },
                false,
                `[MANUAL] Cannot be auto-fixed on an existing notebook instance. KMS encryption must be set at creation time. Stop the notebook using sagemaker:StopNotebookInstanceCommand, then delete it using sagemaker:DeleteNotebookInstanceCommand, and recreate using sagemaker:CreateNotebookInstanceCommand with KmsKeyId set to a customer-managed KMS key ARN. Ensure data is backed up before deletion.`,
              ),
            );
          }

          // Check root access
          if (descRes.RootAccess === 'Enabled') {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Root access enabled on notebook',
                `SageMaker notebook "${notebookName}" has root access enabled`,
                'medium',
                { notebookName, rootAccess: 'Enabled' },
                false,
                `First stop the notebook using sagemaker:StopNotebookInstanceCommand with NotebookInstanceName set to '${notebookName}'. Then use sagemaker:UpdateNotebookInstanceCommand with NotebookInstanceName set to '${notebookName}' and RootAccess set to 'Disabled'. Finally restart with sagemaker:StartNotebookInstanceCommand. Rollback: use sagemaker:UpdateNotebookInstanceCommand with RootAccess set to 'Enabled'.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Root access disabled on notebook',
                `SageMaker notebook "${notebookName}" has root access disabled`,
                'info',
                { notebookName, rootAccess: descRes.RootAccess ?? 'Disabled' },
                true,
              ),
            );
          }

          // Check direct internet access
          if (descRes.DirectInternetAccess === 'Enabled') {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Direct internet access enabled',
                `SageMaker notebook "${notebookName}" has direct internet access enabled`,
                'high',
                { notebookName, directInternetAccess: 'Enabled' },
                false,
                `[MANUAL] Cannot be auto-fixed. DirectInternetAccess can only be set at creation time. Stop the notebook using sagemaker:StopNotebookInstanceCommand, delete using sagemaker:DeleteNotebookInstanceCommand, and recreate using sagemaker:CreateNotebookInstanceCommand with DirectInternetAccess set to 'Disabled' and SubnetId/SecurityGroupIds for VPC access. Ensure data is backed up before deletion.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Direct internet access disabled',
                `SageMaker notebook "${notebookName}" has direct internet access disabled`,
                'info',
                { notebookName, directInternetAccess: descRes.DirectInternetAccess ?? 'Disabled' },
                true,
              ),
            );
          }

          // Check VPC configuration
          if (descRes.SubnetId) {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Notebook deployed in VPC',
                `SageMaker notebook "${notebookName}" is deployed within a VPC`,
                'info',
                { notebookName, subnetId: descRes.SubnetId },
                true,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                notebookArn,
                'Not in VPC',
                `SageMaker notebook "${notebookName}" is not deployed within a VPC`,
                'medium',
                { notebookName },
                false,
                `[MANUAL] Cannot be auto-fixed. VPC configuration can only be set at creation time. Stop the notebook using sagemaker:StopNotebookInstanceCommand, delete using sagemaker:DeleteNotebookInstanceCommand, and recreate using sagemaker:CreateNotebookInstanceCommand with SubnetId set to a VPC subnet and SecurityGroupIds set to security group IDs. Ensure data is backed up before deletion.`,
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
    const id = `sagemaker-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsSageMakerNotebook',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'SageMaker', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

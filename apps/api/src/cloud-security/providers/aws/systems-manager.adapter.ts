import {
  SSMClient,
  DescribeParametersCommand,
  GetDocumentCommand,
  DescribeInstanceInformationCommand,
} from '@aws-sdk/client-ssm';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const SENSITIVE_NAME_PATTERN = /password|secret|key|token/i;

export class SystemsManagerAdapter implements AwsServiceAdapter {
  readonly serviceId = 'systems-manager';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new SSMClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are any managed instances
    try {
      const instanceResp = await client.send(
        new DescribeInstanceInformationCommand({ MaxResults: 1 }),
      );
      if ((instanceResp.InstanceInformationList ?? []).length === 0) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      // Check Session Manager logging via the SSM-SessionManagerRunShell document
      // This is the actual source of truth for Session Manager logging config
      try {
        const docRes = await client.send(
          new GetDocumentCommand({
            Name: 'SSM-SessionManagerRunShell',
            DocumentVersion: '$LATEST',
          }),
        );
        const content = docRes.Content ? JSON.parse(docRes.Content) : {};
        const inputs = content?.inputs ?? {};

        // Logging is configured if there's an actual destination (non-empty bucket or log group)
        const s3Bucket = typeof inputs.s3BucketName === 'string' ? inputs.s3BucketName.trim() : '';
        const cwLogGroup = typeof inputs.cloudWatchLogGroupName === 'string' ? inputs.cloudWatchLogGroupName.trim() : '';
        const hasLogging = s3Bucket.length > 0 || cwLogGroup.length > 0;

        if (hasLogging) {
          findings.push(
            this.makeFinding(
              `arn:aws:ssm:${region}:session-logging`,
              'Session Manager logging enabled',
              'Session Manager logging is enabled for this region',
              'info',
              {
                documentExists: true,
                loggingEnabled: true,
                s3BucketName: s3Bucket || null,
                cloudWatchLogGroupName: cwLogGroup || null,
              },
              true,
            ),
          );
        } else {
          findings.push(
            this.makeFinding(
              `arn:aws:ssm:${region}:session-logging`,
              'Session Manager logging not configured',
              'Session Manager preferences exist but no logging destination (S3 bucket or CloudWatch log group) is configured.',
              'medium',
              { documentExists: true, loggingEnabled: false, currentInputs: inputs },
              undefined,
              'Update the SSM-SessionManagerRunShell document to enable logging. Use ssm:UpdateDocumentCommand with Name "SSM-SessionManagerRunShell" and Content that sets inputs.cloudWatchLogGroupName to a log group name (e.g. "/aws/ssm/session-logs") and inputs.cloudWatchEncryptionEnabled to true. The document Content must be a JSON string with schemaVersion "1.0" and sessionType "Standard_Stream". Create the log group first with logs:CreateLogGroupCommand if it does not exist. Rollback by calling ssm:UpdateDocumentCommand with the original Content.',
            ),
          );
        }
      } catch (docError: unknown) {
        const docMsg = docError instanceof Error ? docError.message : String(docError);
        const errName = docError instanceof Error ? (docError as { name?: string }).name ?? '' : '';

        const isPermissionError = docMsg.toLowerCase().includes('accessdenied')
          || docMsg.toLowerCase().includes('not authorized')
          || docMsg.toLowerCase().includes('access denied')
          || errName === 'AccessDeniedException';

        if (isPermissionError) {
          // Skip silently — auditor role may not have ssm:GetDocument
        } else {
          // Document doesn't exist — Session Manager preferences not set up
          findings.push(
            this.makeFinding(
              `arn:aws:ssm:${region}:session-logging`,
              'Session Manager logging not configured',
              'Session Manager preferences document does not exist. Logging is not configured.',
              'medium',
              { documentExists: false, loggingEnabled: false },
              undefined,
              'Create the SSM-SessionManagerRunShell document with logging enabled. Use ssm:CreateDocumentCommand with Name "SSM-SessionManagerRunShell", DocumentType "Session", and Content as a JSON string with schemaVersion "1.0", sessionType "Standard_Stream", and inputs containing cloudWatchLogGroupName set to "/aws/ssm/session-logs" and cloudWatchEncryptionEnabled set to true. Create the log group first with logs:CreateLogGroupCommand. Rollback by calling ssm:DeleteDocumentCommand with Name "SSM-SessionManagerRunShell".',
            ),
          );
        }
      }

      // Check parameters
      let nextToken: string | undefined;
      let paramCount = 0;

      do {
        const paramRes = await client.send(
          new DescribeParametersCommand({
            NextToken: nextToken,
            MaxResults: 50,
          }),
        );

        for (const param of paramRes.Parameters ?? []) {
          paramCount++;
          if (paramCount > 100) break;

          const paramName = param.Name ?? 'unknown';
          const resourceId = paramName;

          if (param.Type === 'SecureString') {
            if (!param.KeyId || param.KeyId === 'alias/aws/ssm') {
              findings.push(
                this.makeFinding(
                  resourceId,
                  'SecureString parameter uses default key',
                  `Parameter "${paramName}" is a SecureString but uses the default AWS-managed key`,
                  'low',
                  { parameterName: paramName, keyId: param.KeyId ?? 'default' },
                ),
              );
            } else {
              findings.push(
                this.makeFinding(
                  resourceId,
                  'SecureString parameter uses CMK',
                  `Parameter "${paramName}" is encrypted with a customer-managed KMS key`,
                  'info',
                  { parameterName: paramName, keyId: param.KeyId },
                  true,
                ),
              );
            }
          } else if (SENSITIVE_NAME_PATTERN.test(paramName)) {
            findings.push(
              this.makeFinding(
                resourceId,
                'Potentially sensitive parameter not encrypted',
                `Parameter "${paramName}" has a name suggesting sensitive content but is stored as ${param.Type ?? 'String'} instead of SecureString`,
                'medium',
                { parameterName: paramName, type: param.Type ?? 'String' },
              ),
            );
          }
        }

        if (paramCount > 100) break;
        nextToken = paramRes.NextToken;
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
    const id = `systems-manager-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsSsmParameter',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'Systems Manager', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

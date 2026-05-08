import {
  SFNClient,
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
} from '@aws-sdk/client-sfn';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class StepFunctionsAdapter implements AwsServiceAdapter {
  readonly serviceId = 'step-functions';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new SFNClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListStateMachinesCommand({ nextToken }),
        );

        for (const sm of listRes.stateMachines ?? []) {
          const smArn = sm.stateMachineArn;
          if (!smArn) continue;

          const smName = sm.name ?? smArn;

          const descRes = await client.send(
            new DescribeStateMachineCommand({ stateMachineArn: smArn }),
          );

          // Check logging configuration
          const logLevel = descRes.loggingConfiguration?.level;

          if (logLevel === 'OFF' || !logLevel) {
            findings.push(
              this.makeFinding(
                smArn,
                'State machine logging disabled',
                `Step Functions state machine "${smName}" does not have logging enabled`,
                'medium',
                { stateMachineName: smName, loggingLevel: logLevel ?? 'OFF' },
                false,
                `Use sfn:UpdateStateMachineCommand with stateMachineArn set to '${smArn}' and loggingConfiguration set to { level: 'ALL', includeExecutionData: true, destinations: [{ cloudWatchLogsLogGroup: { logGroupArn: '<log-group-arn>' } }] }. Create the CloudWatch log group first using logs:CreateLogGroupCommand. Rollback: use sfn:UpdateStateMachineCommand with loggingConfiguration.level set to 'OFF'.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                smArn,
                'State machine logging enabled',
                `Step Functions state machine "${smName}" has logging enabled (level: ${logLevel})`,
                'info',
                { stateMachineName: smName, loggingLevel: logLevel },
                true,
              ),
            );
          }

          // Check X-Ray tracing
          if (descRes.tracingConfiguration?.enabled !== true) {
            findings.push(
              this.makeFinding(
                smArn,
                'X-Ray tracing not enabled',
                `Step Functions state machine "${smName}" does not have X-Ray tracing enabled`,
                'low',
                {
                  stateMachineName: smName,
                  tracingEnabled: descRes.tracingConfiguration?.enabled,
                },
                false,
                `Use sfn:UpdateStateMachineCommand with stateMachineArn set to '${smArn}' and tracingConfiguration set to { enabled: true }. Ensure the state machine's IAM role has xray:PutTraceSegments and xray:PutTelemetryRecords permissions. Rollback: use sfn:UpdateStateMachineCommand with tracingConfiguration.enabled set to false.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                smArn,
                'X-Ray tracing enabled',
                `Step Functions state machine "${smName}" has X-Ray tracing enabled`,
                'info',
                { stateMachineName: smName, tracingEnabled: true },
                true,
              ),
            );
          }

          // Check encryption configuration
          const encType = descRes.encryptionConfiguration?.type;

          if (encType && encType !== 'CUSTOMER_MANAGED_KMS_KEY') {
            findings.push(
              this.makeFinding(
                smArn,
                'State machine using AWS-managed encryption key',
                `Step Functions state machine "${smName}" uses an AWS-managed key instead of a customer-managed KMS key`,
                'low',
                { stateMachineName: smName, encryptionType: encType },
                false,
                `Use sfn:UpdateStateMachineCommand with stateMachineArn set to '${smArn}' and encryptionConfiguration set to { type: 'CUSTOMER_MANAGED_KMS_KEY', kmsKeyId: '<kms-key-arn>', kmsDataKeyReusePeriodSeconds: 300 }. Rollback: use sfn:UpdateStateMachineCommand with encryptionConfiguration.type set to 'AWS_OWNED_KEY'.`,
              ),
            );
          } else if (encType === 'CUSTOMER_MANAGED_KMS_KEY') {
            findings.push(
              this.makeFinding(
                smArn,
                'State machine using customer-managed KMS key',
                `Step Functions state machine "${smName}" uses a customer-managed KMS key for encryption`,
                'info',
                { stateMachineName: smName, encryptionType: encType },
                true,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                smArn,
                'State machine using AWS-managed encryption key',
                `Step Functions state machine "${smName}" uses default AWS-managed encryption`,
                'low',
                { stateMachineName: smName, encryptionType: 'AWS_OWNED_KEY' },
                false,
                `Use sfn:UpdateStateMachineCommand with stateMachineArn set to '${smArn}' and encryptionConfiguration set to { type: 'CUSTOMER_MANAGED_KMS_KEY', kmsKeyId: '<kms-key-arn>', kmsDataKeyReusePeriodSeconds: 300 }. Rollback: use sfn:UpdateStateMachineCommand with encryptionConfiguration.type set to 'AWS_OWNED_KEY'.`,
              ),
            );
          }
        }

        nextToken = listRes.nextToken;
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
    const id = `step-functions-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsStepFunction',
      resourceId,
      remediation,
      evidence: { ...evidence, service: 'Step Functions', findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

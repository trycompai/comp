import {
  AppflowClient,
  DescribeFlowCommand,
  ListFlowsCommand,
} from '@aws-sdk/client-appflow';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class AppFlowAdapter implements AwsServiceAdapter {
  readonly serviceId = 'appflow';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new AppflowClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListFlowsCommand({ nextToken }),
        );

        for (const flow of listRes.flows ?? []) {
          const flowName = flow.flowName;
          if (!flowName) continue;

          const flowArn = flow.flowArn ?? flowName;

          const descRes = await client.send(
            new DescribeFlowCommand({ flowName }),
          );

          if (!descRes.kmsArn) {
            findings.push(
              this.makeFinding(
                flowArn,
                'Flow not encrypted with CMK',
                `AppFlow flow "${flowName}" is not encrypted with a customer-managed KMS key`,
                'medium',
                { flowName, service: 'AppFlow' },
                false,
                `Use appflow:UpdateFlowCommand with flowName set to '${flowName}' and kmsArn set to a customer-managed KMS key ARN. You must also provide the full flow configuration (sourceFlowConfig, destinationFlowConfigList, tasks, triggerConfig). Rollback: use appflow:UpdateFlowCommand with kmsArn removed to revert to AWS-managed encryption.`,
              ),
            );
          } else {
            findings.push(
              this.makeFinding(
                flowArn,
                'Flow encrypted with CMK',
                `AppFlow flow "${flowName}" is encrypted with customer-managed KMS key`,
                'info',
                { flowName, kmsArn: descRes.kmsArn, service: 'AppFlow' },
                true,
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
    const id = `appflow-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsAppFlow',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

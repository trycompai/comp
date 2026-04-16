import {
  LambdaClient,
  ListFunctionsCommand,
  GetPolicyCommand,
} from '@aws-sdk/client-lambda';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const DEPRECATED_RUNTIMES = [
  'nodejs14.x',
  'nodejs12.x',
  'nodejs10.x',
  'nodejs8.10',
  'python3.7',
  'python3.6',
  'python2.7',
  'ruby2.5',
  'dotnetcore3.1',
  'dotnetcore2.1',
  'java8',
  'go1.x',
];

export class LambdaAdapter implements AwsServiceAdapter {
  readonly serviceId = 'lambda';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new LambdaClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;

      do {
        const resp = await client.send(
          new ListFunctionsCommand({ Marker: marker }),
        );

        const functions = resp.Functions ?? [];

        for (const fn of functions) {
          const arn = fn.FunctionArn ?? 'unknown';
          const name = fn.FunctionName ?? 'unknown';

          // Check for deprecated runtime
          if (fn.Runtime && DEPRECATED_RUNTIMES.includes(fn.Runtime)) {
            findings.push(
              this.makeFinding({
                resourceId: arn,
                title: 'Deprecated runtime in use',
                description: `Lambda function ${name} uses deprecated runtime ${fn.Runtime}. Deprecated runtimes no longer receive security patches.`,
                severity: 'high',
                remediation:
                  '[MANUAL] Cannot be auto-fixed. Updating the Lambda runtime may require code changes. Update the function runtime via lambda:UpdateFunctionConfigurationCommand with Runtime set to the latest supported version.',
                evidence: { runtime: fn.Runtime },
              }),
            );
          }

          // Check for public access via resource policy
          try {
            const policyResp = await client.send(
              new GetPolicyCommand({ FunctionName: name }),
            );

            if (policyResp.Policy) {
              const policy = JSON.parse(policyResp.Policy);
              const statements = policy.Statement ?? [];

              const isPublic = statements.some(
                (stmt: Record<string, unknown>) => {
                  if (stmt.Effect !== 'Allow') return false;
                  const principal = stmt.Principal;
                  if (principal === '*') return true;
                  if (
                    typeof principal === 'object' &&
                    principal !== null &&
                    (principal as Record<string, unknown>).AWS === '*'
                  )
                    return true;
                  return false;
                },
              );

              if (isPublic) {
                findings.push(
                  this.makeFinding({
                    resourceId: arn,
                    title: 'Lambda function is publicly accessible',
                    description: `Lambda function ${name} has a resource policy that allows public invocation.`,
                    severity: 'critical',
                    remediation:
                      'Use lambda:RemovePermissionCommand with FunctionName and StatementId to remove the public policy statement. Rollback by calling lambda:AddPermissionCommand to restore the statement.',
                    evidence: { policy: policy.Statement },
                  }),
                );
              }
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            // ResourceNotFoundException means no policy — not public, skip
            if (msg.includes('ResourceNotFoundException')) {
              // No policy attached — this is normal
            } else if (msg.includes('AccessDenied')) {
              return [];
            }
          }

          // Check VPC configuration
          if (!fn.VpcConfig?.VpcId) {
            findings.push(
              this.makeFinding({
                resourceId: arn,
                title: 'Lambda function not deployed in VPC',
                description: `Lambda function ${name} is not deployed within a VPC. Functions outside a VPC cannot access private resources and lack network-level isolation.`,
                severity: 'low',
                remediation:
                  '[MANUAL] Cannot be auto-fixed. Adding a Lambda to a VPC requires VPC subnet and security group configuration decisions.',
                evidence: { vpcConfig: fn.VpcConfig ?? null },
              }),
            );
          }
        }

        marker = resp.NextMarker;
      } while (marker);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(params: {
    resourceId: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    remediation?: string;
    evidence?: Record<string, unknown>;
    passed?: boolean;
  }): SecurityFinding {
    const id = `lambda-${params.resourceId}-${params.title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      resourceType: 'AwsLambdaFunction',
      resourceId: params.resourceId,
      remediation: params.remediation,
      evidence: { ...params.evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed: params.passed,
    };
  }
}

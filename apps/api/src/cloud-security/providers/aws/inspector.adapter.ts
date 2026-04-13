import {
  Inspector2Client,
  BatchGetAccountStatusCommand,
} from '@aws-sdk/client-inspector2';
import {
  EC2Client,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  ECRClient,
  DescribeRepositoriesCommand,
} from '@aws-sdk/client-ecr';
import {
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class InspectorAdapter implements AwsServiceAdapter {
  readonly serviceId = 'inspector';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new Inspector2Client({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are scannable resources (EC2, ECR, Lambda)
    let hasEc2 = false;
    let hasEcr = false;
    let hasLambda = false;

    try {
      const ec2Client = new EC2Client({ credentials, region });
      const ec2Resp = await ec2Client.send(
        new DescribeInstancesCommand({ MaxResults: 5 }),
      );
      hasEc2 = (ec2Resp.Reservations ?? []).some(
        (r) => (r.Instances ?? []).length > 0,
      );

      const ecrClient = new ECRClient({ credentials, region });
      const ecrResp = await ecrClient.send(
        new DescribeRepositoriesCommand({ maxResults: 1 }),
      );
      hasEcr = (ecrResp.repositories ?? []).length > 0;

      const lambdaClient = new LambdaClient({ credentials, region });
      const lambdaResp = await lambdaClient.send(
        new ListFunctionsCommand({ MaxItems: 1 }),
      );
      hasLambda = (lambdaResp.Functions ?? []).length > 0;

      if (!hasEc2 && !hasEcr && !hasLambda) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
      hasEc2 = true;
      hasEcr = true;
      hasLambda = true;
    }

    try {
      const response = await client.send(
        new BatchGetAccountStatusCommand({ accountIds: [] }),
      );

      const account = response.accounts?.[0];

      if (!account?.resourceState) {
        findings.push(
          this.makeFinding({
            id: `inspector-no-status-${region}`,
            title: 'Inspector not enabled',
            description: `AWS Inspector could not retrieve account status in ${region}.`,
            severity: 'medium',
            resourceId: `arn:aws:inspector2:${region}`,
            remediation: `Use inspector2:EnableCommand with resourceTypes set to ['EC2', 'ECR', 'LAMBDA', 'LAMBDA_CODE'] and accountIds set to the target account ID. Rollback: use inspector2:DisableCommand with the same resourceTypes and accountIds.`,
          }),
        );
        return findings;
      }

      const resourceState = account.resourceState;
      // Only check scan types for resources that actually exist
      const scanTypes = [
        ...(hasEc2
          ? [{ name: 'EC2', status: resourceState.ec2?.status }]
          : []),
        ...(hasEcr
          ? [{ name: 'ECR', status: resourceState.ecr?.status }]
          : []),
        ...(hasLambda
          ? [
              { name: 'Lambda', status: resourceState.lambda?.status },
              { name: 'Lambda Code', status: resourceState.lambdaCode?.status },
            ]
          : []),
      ];

      const disabled = scanTypes.filter((s) => s.status !== 'ENABLED');

      if (disabled.length > 0) {
        findings.push(
          this.makeFinding({
            id: `inspector-partial-${region}`,
            title: 'Inspector scan types not fully enabled',
            description: `The following Inspector scan types are not enabled in ${region}: ${disabled.map((d) => d.name).join(', ')}.`,
            severity: 'medium',
            resourceId: `arn:aws:inspector2:${region}`,
            remediation:
              `Use inspector2:EnableCommand with resourceTypes set to ['EC2', 'ECR', 'LAMBDA', 'LAMBDA_CODE'] and accountIds set to the target account ID. Rollback: use inspector2:DisableCommand with the same resourceTypes and accountIds.`,
            evidence: Object.fromEntries(
              scanTypes.map((s) => [s.name, s.status ?? 'UNKNOWN']),
            ),
          }),
        );
      } else {
        findings.push(
          this.makeFinding({
            id: `inspector-enabled-${region}`,
            title: 'Inspector fully enabled',
            description: `All Inspector scan types are enabled in ${region}.`,
            severity: 'info',
            resourceId: `arn:aws:inspector2:${region}`,
            passed: true,
          }),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];

      if (msg.includes('not enabled')) {
        findings.push(
          this.makeFinding({
            id: `inspector-not-enabled-${region}`,
            title: 'Inspector not enabled',
            description: `AWS Inspector is not enabled in ${region}.`,
            severity: 'medium',
            resourceId: `arn:aws:inspector2:${region}`,
            remediation: `Use inspector2:EnableCommand with resourceTypes set to ['EC2', 'ECR', 'LAMBDA', 'LAMBDA_CODE'] and accountIds set to the target account ID. Rollback: use inspector2:DisableCommand with the same resourceTypes and accountIds.`,
          }),
        );
        return findings;
      }

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
      resourceType: 'AwsInspectorCoverage',
      createdAt: new Date().toISOString(),
    };
  }
}

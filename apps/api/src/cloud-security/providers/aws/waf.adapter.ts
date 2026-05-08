import {
  GetWebACLCommand,
  ListWebACLsCommand,
  WAFV2Client,
} from '@aws-sdk/client-wafv2';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  ApiGatewayV2Client,
  GetApisCommand,
} from '@aws-sdk/client-apigatewayv2';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class WafAdapter implements AwsServiceAdapter {
  readonly serviceId = 'waf';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new WAFV2Client({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are web-facing resources (ALBs, API Gateways)
    try {
      let hasWebResources = false;

      const elbClient = new ElasticLoadBalancingV2Client({
        credentials,
        region,
      });
      const elbResp = await elbClient.send(
        new DescribeLoadBalancersCommand({ PageSize: 1 }),
      );
      if ((elbResp.LoadBalancers ?? []).length > 0) {
        hasWebResources = true;
      }

      if (!hasWebResources) {
        const apigwClient = new ApiGatewayV2Client({ credentials, region });
        const apigwResp = await apigwClient.send(
          new GetApisCommand({ MaxResults: '1' }),
        );
        if ((apigwResp.Items ?? []).length > 0) {
          hasWebResources = true;
        }
      }

      if (!hasWebResources) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      let nextMarker: string | undefined;
      let hasAcls = false;

      do {
        const listRes = await client.send(
          new ListWebACLsCommand({ Scope: 'REGIONAL', NextMarker: nextMarker }),
        );

        for (const summary of listRes.WebACLs ?? []) {
          hasAcls = true;
          const arn = summary.ARN;
          if (!arn || !summary.Name || !summary.Id) continue;

          try {
            const aclRes = await client.send(
              new GetWebACLCommand({
                Name: summary.Name,
                Scope: 'REGIONAL',
                Id: summary.Id,
              }),
            );

            const rules = aclRes.WebACL?.Rules ?? [];

            if (rules.length === 0) {
              findings.push(
                this.makeFinding(
                  arn,
                  'WAF ACL has no rules',
                  `Web ACL "${summary.Name}" has no rules configured, providing no protection`,
                  'medium',
                  { aclName: summary.Name },
                ),
              );
            } else {
              findings.push(
                this.makeFinding(
                  arn,
                  'WAF ACL has rules configured',
                  `Web ACL "${summary.Name}" has ${rules.length} rule(s) configured`,
                  'info',
                  { aclName: summary.Name, ruleCount: rules.length },
                  true,
                ),
              );
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes('WAFNonexistentItemException')) continue;
            throw error;
          }
        }

        nextMarker = listRes.NextMarker;
      } while (nextMarker);

      if (!hasAcls) {
        findings.push(
          this.makeFinding(
            `arn:aws:wafv2:${region}:no-acls`,
            'No WAF web ACLs configured',
            'No regional WAF web ACLs found in this region',
            'medium',
            { region },
          ),
        );
      }
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
  ): SecurityFinding {
    const id = `waf-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsWafWebAcl',
      resourceId,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

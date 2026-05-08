import {
  ApiGatewayV2Client,
  GetApisCommand,
  GetStagesCommand,
  GetRoutesCommand,
} from '@aws-sdk/client-apigatewayv2';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class ApiGatewayAdapter implements AwsServiceAdapter {
  readonly serviceId = 'api-gateway';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
    accountId,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ApiGatewayV2Client({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const resp = await client.send(
          new GetApisCommand({ NextToken: nextToken }),
        );

        for (const api of resp.Items ?? []) {
          if (!api.ApiId || !api.ApiEndpoint) continue;

          const apiName = api.Name ?? api.ApiId;

          if (api.ProtocolType === 'HTTP') {
            const apiFindings = await this.checkApi(
              client,
              api.ApiId,
              apiName,
              region,
              accountId,
            );
            findings.push(...apiFindings);
          }
        }

        nextToken = resp.NextToken;
      } while (nextToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private async checkApi(
    client: ApiGatewayV2Client,
    apiId: string,
    apiName: string,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      // Check routes for authorization
      const routesResp = await client.send(
        new GetRoutesCommand({ ApiId: apiId }),
      );

      for (const route of routesResp.Items ?? []) {
        const routeKey = route.RouteKey ?? 'unknown';

        if (!route.AuthorizationType || route.AuthorizationType === 'NONE') {
          findings.push(
            this.makeFinding({
              id: `apigw-no-auth-${apiId}-${routeKey}`,
              title: `API Gateway "${apiName}" route "${routeKey}" has no authorization configured (${region})`,
              description: `API ${apiName} route ${routeKey} does not have an authorization type configured. The route is accessible without authentication.`,
              severity: 'medium',
              resourceId: apiId,
              remediation: `Use apigatewayv2:UpdateRouteCommand with ApiId set to "${apiId}", RouteId set to the route ID for "${routeKey}", and AuthorizationType set to 'JWT', 'AWS_IAM', or 'CUSTOM'. Provide AuthorizerId if using JWT or CUSTOM. Rollback: use apigatewayv2:UpdateRouteCommand with AuthorizationType set to 'NONE'.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }
      }

      // Check stages for access logging
      const stagesResp = await client.send(
        new GetStagesCommand({ ApiId: apiId }),
      );

      for (const stage of stagesResp.Items ?? []) {
        const stageName = stage.StageName ?? 'unknown';

        if (!stage.AccessLogSettings?.DestinationArn) {
          findings.push(
            this.makeFinding({
              id: `apigw-no-logging-${apiId}/${stageName}`,
              title: `API Gateway "${apiName}" stage "${stageName}" has access logging not enabled (${region})`,
              description: `API ${apiName} stage ${stageName} does not have access logging configured. API calls are not being logged for audit and troubleshooting.`,
              severity: 'medium',
              resourceId: apiId,
              remediation: `Use apigatewayv2:UpdateStageCommand with ApiId set to "${apiId}", StageName set to "${stageName}", and AccessLogSettings.DestinationArn set to a CloudWatch Logs log group ARN. Set AccessLogSettings.Format to a JSON log format string (e.g., '{"requestId":"$context.requestId","ip":"$context.identity.sourceIp"}'). Rollback: use apigatewayv2:UpdateStageCommand with AccessLogSettings set to empty object.`,
              passed: false,
              accountId,
              region,
            }),
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    resourceId?: string;
    remediation?: string;
    passed: boolean;
    accountId?: string;
    region?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'AwsApiGatewayApi',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'API Gateway',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

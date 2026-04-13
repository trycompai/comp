import {
  CloudFrontClient,
  ListDistributionsCommand,
  GetDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class CloudFrontAdapter implements AwsServiceAdapter {
  readonly serviceId = 'cloudfront';
  readonly isGlobal = true;

  async scan({
    credentials,
    region,
    accountId,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new CloudFrontClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextMarker: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const resp = await client.send(
          new ListDistributionsCommand({ Marker: nextMarker }),
        );

        const distList = resp.DistributionList;
        if (!distList) break;

        for (const dist of distList.Items ?? []) {
          if (!dist.Id) continue;

          const distId = dist.Id;
          const domainName = dist.DomainName ?? distId;

          this.checkViewerProtocol(dist, distId, domainName, region, accountId, findings);
          this.checkWaf(dist, distId, domainName, region, accountId, findings);
          await this.checkLogging(client, distId, domainName, region, accountId, findings);
        }

        if (distList.IsTruncated && distList.NextMarker) {
          nextMarker = distList.NextMarker;
        } else {
          hasMore = false;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private checkViewerProtocol(
    dist: {
      DefaultCacheBehavior?: { ViewerProtocolPolicy?: string };
      CacheBehaviors?: { Items?: { ViewerProtocolPolicy?: string }[] };
    },
    distId: string,
    domainName: string,
    region: string,
    accountId: string | undefined,
    findings: SecurityFinding[],
  ): void {
    const policies: (string | undefined)[] = [];

    if (dist.DefaultCacheBehavior?.ViewerProtocolPolicy) {
      policies.push(dist.DefaultCacheBehavior.ViewerProtocolPolicy);
    }

    for (const behavior of dist.CacheBehaviors?.Items ?? []) {
      if (behavior.ViewerProtocolPolicy) {
        policies.push(behavior.ViewerProtocolPolicy);
      }
    }

    const allowsHttp = policies.some((p) => p === 'allow-all');

    if (allowsHttp) {
      findings.push(
        this.makeFinding({
          id: `cloudfront-http-allowed-${distId}`,
          title: `CloudFront distribution "${domainName}" allows HTTP traffic (${region})`,
          description: `Distribution ${distId} has a cache behavior with ViewerProtocolPolicy set to "allow-all", permitting unencrypted HTTP connections.`,
          severity: 'high',
          resourceId: distId,
          remediation: `Use cloudfront:UpdateDistributionCommand with Id set to "${distId}". In DistributionConfig, set DefaultCacheBehavior.ViewerProtocolPolicy to 'redirect-to-https' and update all CacheBehaviors.Items[].ViewerProtocolPolicy to 'redirect-to-https'. You must include the full DistributionConfig and the current IfMatch ETag from cloudfront:GetDistributionCommand. Rollback: set ViewerProtocolPolicy back to 'allow-all'.`,
          passed: false,
          accountId,
          region,
        }),
      );
    }
  }

  private checkWaf(
    dist: { WebACLId?: string },
    distId: string,
    domainName: string,
    region: string,
    accountId: string | undefined,
    findings: SecurityFinding[],
  ): void {
    if (!dist.WebACLId) {
      findings.push(
        this.makeFinding({
          id: `cloudfront-no-waf-${distId}`,
          title: `CloudFront distribution "${domainName}" has no WAF associated (${region})`,
          description: `Distribution ${distId} is not associated with an AWS WAF web ACL. There is no web application firewall protecting this distribution.`,
          severity: 'medium',
          resourceId: distId,
          remediation: `Use cloudfront:UpdateDistributionCommand with Id set to "${distId}". In DistributionConfig, set WebACLId to the WAF web ACL ARN. You must include the full DistributionConfig and the current IfMatch ETag from cloudfront:GetDistributionCommand. Rollback: set WebACLId to an empty string to disassociate.`,
          passed: false,
          accountId,
          region,
        }),
      );
    }
  }

  private async checkLogging(
    client: CloudFrontClient,
    distId: string,
    domainName: string,
    region: string,
    accountId: string | undefined,
    findings: SecurityFinding[],
  ): Promise<void> {
    try {
      const resp = await client.send(
        new GetDistributionCommand({ Id: distId }),
      );

      const logging = resp.Distribution?.DistributionConfig?.Logging;

      if (!logging?.Enabled) {
        findings.push(
          this.makeFinding({
            id: `cloudfront-no-logging-${distId}`,
            title: `CloudFront distribution "${domainName}" has access logging disabled (${region})`,
            description: `Distribution ${distId} does not have access logging enabled. Request logs are not being captured for audit or analysis.`,
            severity: 'medium',
            resourceId: distId,
            remediation: `Use cloudfront:UpdateDistributionCommand with Id set to "${distId}". In DistributionConfig.Logging, set Enabled to true, Bucket to an S3 bucket domain (e.g., 'my-logs-bucket.s3.amazonaws.com'), and Prefix to a log prefix string. You must include the full DistributionConfig and the current IfMatch ETag from cloudfront:GetDistributionCommand. Rollback: set Logging.Enabled to false.`,
            passed: false,
            accountId,
            region,
          }),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return;
      throw error;
    }
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
      resourceType: 'AwsCloudFrontDistribution',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'CloudFront',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}

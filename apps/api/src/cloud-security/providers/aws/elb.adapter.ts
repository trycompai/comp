import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeListenersCommand,
  DescribeLoadBalancerAttributesCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class ElbAdapter implements AwsServiceAdapter {
  readonly serviceId = 'elb';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ElasticLoadBalancingV2Client({
      credentials,
      region,
    });

    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;

      do {
        const resp = await client.send(
          new DescribeLoadBalancersCommand({ Marker: marker }),
        );

        const loadBalancers = resp.LoadBalancers ?? [];

        for (const lb of loadBalancers) {
          const arn = lb.LoadBalancerArn ?? 'unknown';

          // Check listeners for HTTPS/TLS
          try {
            const listenersResp = await client.send(
              new DescribeListenersCommand({ LoadBalancerArn: arn }),
            );
            const listeners = listenersResp.Listeners ?? [];
            const hasSecureListener = listeners.some(
              (l) => l.Protocol === 'HTTPS' || l.Protocol === 'TLS',
            );

            if (!hasSecureListener && listeners.length > 0) {
              findings.push(
                this.makeFinding({
                  resourceId: arn,
                  title: 'No HTTPS listeners configured',
                  description: `Load balancer ${lb.LoadBalancerName} has no HTTPS or TLS listeners. Traffic is transmitted unencrypted.`,
                  severity: 'high',
                  remediation:
                    `Use elbv2:CreateListenerCommand with LoadBalancerArn set to '${arn}', Protocol set to 'HTTPS', Port set to 443, and Certificates containing the ACM certificate ARN. Set DefaultActions to forward to the target group. Rollback: use elbv2:DeleteListenerCommand with the ListenerArn returned from the create call.`,
                  evidence: {
                    protocols: listeners.map((l) => l.Protocol),
                  },
                }),
              );
            }
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : String(error);
            if (msg.includes('AccessDenied')) return [];
          }

          // Check attributes for access logging and deletion protection
          try {
            const attrsResp = await client.send(
              new DescribeLoadBalancerAttributesCommand({
                LoadBalancerArn: arn,
              }),
            );
            const attrs = attrsResp.Attributes ?? [];

            const accessLogsAttr = attrs.find(
              (a) => a.Key === 'access_logs.s3.enabled',
            );
            if (accessLogsAttr?.Value !== 'true') {
              findings.push(
                this.makeFinding({
                  resourceId: arn,
                  title: 'Access logging disabled',
                  description: `Load balancer ${lb.LoadBalancerName} does not have access logging enabled.`,
                  severity: 'medium',
                  remediation:
                    `Use elbv2:ModifyLoadBalancerAttributesCommand with LoadBalancerArn set to '${arn}' and Attributes containing Key: 'access_logs.s3.enabled', Value: 'true' and Key: 'access_logs.s3.bucket', Value: '<bucket-name>' and Key: 'access_logs.s3.prefix', Value: '<prefix>'. Rollback: use elbv2:ModifyLoadBalancerAttributesCommand with 'access_logs.s3.enabled' set to 'false'.`,
                  evidence: {
                    accessLogsEnabled: accessLogsAttr?.Value ?? 'not set',
                  },
                }),
              );
            }

            const deletionProtectionAttr = attrs.find(
              (a) => a.Key === 'deletion_protection.enabled',
            );
            if (deletionProtectionAttr?.Value !== 'true') {
              findings.push(
                this.makeFinding({
                  resourceId: arn,
                  title: 'Deletion protection disabled',
                  description: `Load balancer ${lb.LoadBalancerName} does not have deletion protection enabled.`,
                  severity: 'medium',
                  remediation:
                    `Use elbv2:ModifyLoadBalancerAttributesCommand with LoadBalancerArn set to '${arn}' and Attributes containing Key: 'deletion_protection.enabled', Value: 'true'. Rollback: use elbv2:ModifyLoadBalancerAttributesCommand with Key: 'deletion_protection.enabled', Value: 'false'.`,
                  evidence: {
                    deletionProtectionEnabled:
                      deletionProtectionAttr?.Value ?? 'not set',
                  },
                }),
              );
            }
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : String(error);
            if (msg.includes('AccessDenied')) return [];
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
    const id = `elb-${params.resourceId}-${params.title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      resourceType: 'AwsElbLoadBalancer',
      resourceId: params.resourceId,
      remediation: params.remediation,
      evidence: { ...(params.evidence ?? {}), findingKey: id },
      createdAt: new Date().toISOString(),
      passed: params.passed,
    };
  }
}

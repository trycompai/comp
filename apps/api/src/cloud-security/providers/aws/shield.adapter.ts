import {
  ShieldClient,
  GetSubscriptionStateCommand,
} from '@aws-sdk/client-shield';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  CloudFrontClient,
  ListDistributionsCommand,
} from '@aws-sdk/client-cloudfront';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class ShieldAdapter implements AwsServiceAdapter {
  readonly serviceId = 'shield';
  readonly isGlobal = true;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ShieldClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if there are public-facing resources (ELBs, CloudFront distributions)
    try {
      let hasPublicResources = false;

      const elbClient = new ElasticLoadBalancingV2Client({
        credentials,
        region,
      });
      const elbResp = await elbClient.send(
        new DescribeLoadBalancersCommand({ PageSize: 1 }),
      );
      if ((elbResp.LoadBalancers ?? []).length > 0) {
        hasPublicResources = true;
      }

      if (!hasPublicResources) {
        const cfClient = new CloudFrontClient({
          credentials,
          region: 'us-east-1',
        });
        const cfResp = await cfClient.send(
          new ListDistributionsCommand({ MaxItems: 1 }),
        );
        if (
          (cfResp.DistributionList?.Items ?? []).length > 0
        ) {
          hasPublicResources = true;
        }
      }

      if (!hasPublicResources) return [];
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      const res = await client.send(new GetSubscriptionStateCommand({}));

      if (res.SubscriptionState === 'ACTIVE') {
        findings.push(
          this.makeFinding({
            id: 'shield-advanced-active',
            title: 'Shield Advanced is active',
            description:
              'AWS Shield Advanced subscription is active, providing enhanced DDoS protection.',
            severity: 'info',
            resourceId: 'arn:aws:shield::subscription',
            evidence: { service: 'Shield', subscriptionState: 'ACTIVE' },
            passed: true,
          }),
        );
      } else {
        findings.push(
          this.makeFinding({
            id: 'shield-advanced-not-enabled',
            title: 'Shield Advanced not enabled',
            description:
              'AWS Shield Advanced is not enabled. Only basic Shield (free) protection is in place.',
            severity: 'medium',
            resourceId: 'arn:aws:shield::subscription',
            evidence: {
              service: 'Shield',
              subscriptionState: res.SubscriptionState,
            },
            remediation:
              '[MANUAL] Cannot be fully auto-fixed. Use shield:CreateSubscriptionCommand to enable Shield Advanced. This incurs a $3,000/month commitment with a 1-year minimum. After subscription, use shield:CreateProtectionCommand with ResourceArn for each resource to protect. Rollback: Shield Advanced subscriptions cannot be cancelled during the commitment period.',
          }),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      if (
        msg.includes('SubscriptionNotFoundException') ||
        msg.includes('ResourceNotFoundException')
      ) {
        findings.push(
          this.makeFinding({
            id: 'shield-advanced-not-enabled',
            title: 'Shield Advanced not enabled',
            description:
              'AWS Shield Advanced subscription is not available for this account.',
            severity: 'medium',
            resourceId: 'arn:aws:shield::subscription',
            evidence: { service: 'Shield', error: msg },
            remediation:
              '[MANUAL] Cannot be fully auto-fixed. Use shield:CreateSubscriptionCommand to enable Shield Advanced. This incurs a $3,000/month commitment with a 1-year minimum. Rollback: Shield Advanced subscriptions cannot be cancelled during the commitment period.',
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
      evidence: { ...params.evidence, findingKey: params.id },
      resourceType: 'AwsShieldSubscription',
      createdAt: new Date().toISOString(),
    };
  }
}

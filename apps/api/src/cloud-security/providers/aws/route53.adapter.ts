import {
  Route53Client,
  ListHostedZonesCommand,
  GetDNSSECCommand,
  ListQueryLoggingConfigsCommand,
} from '@aws-sdk/client-route-53';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class Route53Adapter implements AwsServiceAdapter {
  readonly serviceId = 'route53';
  readonly isGlobal = true;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new Route53Client({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let marker: string | undefined;

      do {
        const resp = await client.send(
          new ListHostedZonesCommand({
            Marker: marker,
            MaxItems: 100,
          }),
        );

        const zones = resp.HostedZones ?? [];

        for (const zone of zones) {
          const rawId = zone.Id ?? '';
          const zoneId = rawId.replace('/hostedzone/', '');
          const zoneName = zone.Name ?? 'unknown';

          // DNSSEC check — only for public zones
          if (zone.Config?.PrivateZone !== true) {
            try {
              const dnssecResp = await client.send(
                new GetDNSSECCommand({ HostedZoneId: zoneId }),
              );

              if (dnssecResp.Status?.ServeSignature !== 'SIGNING') {
                findings.push(
                  this.makeFinding({
                    resourceId: zoneId,
                    title: 'DNSSEC not enabled',
                    description: `Hosted zone ${zoneName} (${zoneId}) does not have DNSSEC signing enabled. DNSSEC protects against DNS spoofing attacks.`,
                    severity: 'medium',
                    remediation: `Use route53:CreateKeySigningKeyCommand with HostedZoneId set to '${zoneId}', Name set to a KSK name, KeyManagementServiceArn set to a KMS key ARN (must be in us-east-1, asymmetric ECC_NIST_P256). Then use route53:EnableHostedZoneDNSSECCommand with HostedZoneId set to '${zoneId}'. [MANUAL] You must also create a DS record in the parent zone. Rollback: use route53:DisableHostedZoneDNSSECCommand with HostedZoneId.`,
                    evidence: {
                      serveSignature:
                        dnssecResp.Status?.ServeSignature ?? 'not set',
                    },
                  }),
                );
              }
            } catch (error) {
              const msg =
                error instanceof Error ? error.message : String(error);
              if (msg.includes('AccessDenied')) return [];
              if (
                msg.includes('DNSSECNotFound') ||
                msg.includes('InvalidArgument')
              ) {
                findings.push(
                  this.makeFinding({
                    resourceId: zoneId,
                    title: 'DNSSEC not enabled',
                    description: `Hosted zone ${zoneName} (${zoneId}) does not have DNSSEC configured.`,
                    severity: 'medium',
                    remediation: `Use route53:CreateKeySigningKeyCommand with HostedZoneId set to '${zoneId}', Name set to a KSK name, KeyManagementServiceArn set to a KMS key ARN (must be in us-east-1, asymmetric ECC_NIST_P256). Then use route53:EnableHostedZoneDNSSECCommand with HostedZoneId set to '${zoneId}'. [MANUAL] You must also create a DS record in the parent zone. Rollback: use route53:DisableHostedZoneDNSSECCommand with HostedZoneId.`,
                    evidence: { error: msg },
                  }),
                );
              }
            }
          }

          // Query logging check
          try {
            const loggingResp = await client.send(
              new ListQueryLoggingConfigsCommand({ HostedZoneId: zoneId }),
            );

            const configs = loggingResp.QueryLoggingConfigs ?? [];
            if (configs.length === 0) {
              findings.push(
                this.makeFinding({
                  resourceId: zoneId,
                  title: 'Query logging not enabled',
                  description: `Hosted zone ${zoneName} (${zoneId}) does not have DNS query logging enabled.`,
                  severity: 'low',
                  remediation: `Use route53:CreateQueryLoggingConfigCommand with HostedZoneId set to '${zoneId}' and CloudWatchLogsLogGroupArn set to a CloudWatch Logs log group ARN in us-east-1 (required region). The log group must have a resource policy allowing Route53 to write to it. Rollback: use route53:DeleteQueryLoggingConfigCommand with the Id returned from the create call.`,
                  evidence: { queryLoggingConfigs: 0 },
                }),
              );
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
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
    const id = `route53-${params.resourceId}-${params.title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      resourceType: 'AwsRoute53HostedZone',
      resourceId: params.resourceId,
      remediation: params.remediation,
      evidence: { ...(params.evidence ?? {}), findingKey: id },
      createdAt: new Date().toISOString(),
      passed: params.passed,
    };
  }
}

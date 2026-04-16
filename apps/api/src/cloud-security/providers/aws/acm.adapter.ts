import {
  ACMClient,
  DescribeCertificateCommand,
  ListCertificatesCommand,
} from '@aws-sdk/client-acm';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class AcmAdapter implements AwsServiceAdapter {
  readonly serviceId = 'acm';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ACMClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const listRes = await client.send(
          new ListCertificatesCommand({ NextToken: nextToken }),
        );

        for (const summary of listRes.CertificateSummaryList ?? []) {
          const arn = summary.CertificateArn;
          if (!arn) continue;

          const descRes = await client.send(
            new DescribeCertificateCommand({ CertificateArn: arn }),
          );

          const cert = descRes.Certificate;
          if (!cert) continue;

          const notAfter = cert.NotAfter;
          if (notAfter) {
            const daysUntilExpiry = Math.floor(
              (notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            if (daysUntilExpiry < 0) {
              findings.push(
                this.makeFinding(
                  arn,
                  'Certificate has expired',
                  `Certificate expired ${Math.abs(daysUntilExpiry)} days ago`,
                  'critical',
                  { daysUntilExpiry, notAfter: notAfter.toISOString() },
                  false,
                  `Use acm:RequestCertificateCommand with DomainName set to the certificate's domain and ValidationMethod set to 'DNS' (or 'EMAIL') to request a replacement certificate. After validation, update resources referencing the old certificate ARN. [MANUAL] Certificate renewal requires DNS or email validation that cannot be fully automated. Rollback: resources can be pointed back to the old certificate ARN if it is renewed.`,
                ),
              );
            } else if (daysUntilExpiry < 7) {
              findings.push(
                this.makeFinding(
                  arn,
                  'Certificate expiring within 7 days',
                  `Certificate expires in ${daysUntilExpiry} days`,
                  'critical',
                  { daysUntilExpiry, notAfter: notAfter.toISOString() },
                  false,
                  `Use acm:RenewCertificateCommand with CertificateArn to trigger renewal for imported certificates. For ACM-issued certificates, renewal is automatic if DNS validation records are in place. [MANUAL] If DNS validation records are missing, you must add them or use acm:RequestCertificateCommand to request a new certificate. Rollback: not applicable for renewal.`,
                ),
              );
            } else if (daysUntilExpiry < 30) {
              findings.push(
                this.makeFinding(
                  arn,
                  'Certificate expiring within 30 days',
                  `Certificate expires in ${daysUntilExpiry} days`,
                  'high',
                  { daysUntilExpiry, notAfter: notAfter.toISOString() },
                  false,
                  `Use acm:RenewCertificateCommand with CertificateArn to trigger renewal for imported certificates. For ACM-issued certificates, renewal is automatic if DNS validation records are in place. [MANUAL] If DNS validation records are missing, you must add them. Rollback: not applicable for renewal.`,
                ),
              );
            } else {
              findings.push(
                this.makeFinding(
                  arn,
                  'Certificate is valid',
                  `Certificate expires in ${daysUntilExpiry} days`,
                  'info',
                  { daysUntilExpiry, notAfter: notAfter.toISOString() },
                  true,
                ),
              );
            }
          }

          if (
            cert.Type === 'AMAZON_ISSUED' &&
            cert.RenewalEligibility === 'INELIGIBLE'
          ) {
            findings.push(
              this.makeFinding(
                arn,
                'ACM certificate not eligible for renewal',
                'ACM-issued certificate is marked as ineligible for automatic renewal',
                'medium',
                { renewalEligibility: cert.RenewalEligibility },
                false,
                `[MANUAL] Cannot be auto-fixed. The certificate is ineligible for automatic renewal, typically because DNS validation records are missing or the domain is no longer resolvable. Verify DNS validation CNAME records are present for the certificate domain. If records are missing, use acm:RequestCertificateCommand to request a new certificate with ValidationMethod 'DNS' and add the new validation records.`,
              ),
            );
          }
        }

        nextToken = listRes.NextToken;
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
    const id = `acm-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsAcmCertificate',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

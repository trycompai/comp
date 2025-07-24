import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig, CommonConfig } from '../types';

export interface SSLOutputs {
  certificates: Record<string, aws.acm.Certificate>;
  validationRecords: Array<{
    domain: string;
    name: pulumi.Output<string>;
    type: pulumi.Output<string>;
    value: pulumi.Output<string>;
  }>;
}

export function createSSLCertificates(
  config: CommonConfig,
  applications: ApplicationConfig[],
): SSLOutputs {
  // Collect all unique domains that need certificates (only for apps with custom domains)
  const domainsNeedingCerts = new Set<string>();
  applications.forEach((app) => {
    if (app.routing?.hostnames && app.routing.hostnames.length > 0) {
      app.routing.hostnames.forEach((hostname) => {
        domainsNeedingCerts.add(hostname);
      });
    }
  });

  const certificates: Record<string, aws.acm.Certificate> = {};
  const validationRecords: Array<{
    domain: string;
    name: pulumi.Output<string>;
    type: pulumi.Output<string>;
    value: pulumi.Output<string>;
  }> = [];

  // Only create certificates if we have domains that need them
  if (domainsNeedingCerts.size > 0) {
    Array.from(domainsNeedingCerts).forEach((domain) => {
      // Create certificate
      const cert = new aws.acm.Certificate(
        `${config.projectName}-cert-${domain.replace(/\./g, '-')}`,
        {
          domainName: domain,
          validationMethod: 'DNS',
          tags: {
            ...config.commonTags,
            Name: `${config.projectName}-cert-${domain}`,
            Type: 'ssl-certificate',
            Domain: domain,
          },
        },
      );

      certificates[domain] = cert;

      // Store validation record info for manual creation in any DNS provider
      validationRecords.push({
        domain,
        name: cert.domainValidationOptions.apply((options) => options[0].resourceRecordName),
        type: cert.domainValidationOptions.apply((options) => options[0].resourceRecordType),
        value: cert.domainValidationOptions.apply((options) => options[0].resourceRecordValue),
      });
    });
  }

  return {
    certificates,
    validationRecords,
  };
}

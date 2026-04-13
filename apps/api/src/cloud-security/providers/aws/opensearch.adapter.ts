import {
  DescribeDomainCommand,
  ListDomainNamesCommand,
  OpenSearchClient,
} from '@aws-sdk/client-opensearch';

import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class OpenSearchAdapter implements AwsServiceAdapter {
  readonly serviceId = 'opensearch';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new OpenSearchClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const listRes = await client.send(new ListDomainNamesCommand({}));

      for (const domainInfo of listRes.DomainNames ?? []) {
        const domainName = domainInfo.DomainName;
        if (!domainName) continue;

        try {
          const descRes = await client.send(
            new DescribeDomainCommand({ DomainName: domainName }),
          );

          const domain = descRes.DomainStatus;
          if (!domain) continue;

          const resourceId = domain.ARN ?? domainName;

          if (domain.EncryptionAtRestOptions?.Enabled !== true) {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch encryption at rest is disabled', `Domain "${domainName}" does not have encryption at rest enabled`, 'high', { domainName, encryptionAtRest: false }, false, `Use opensearch:UpdateDomainConfigCommand with DomainName and EncryptionAtRestOptions.Enabled set to true. Rollback by setting to false.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch encryption at rest is enabled', `Domain "${domainName}" has encryption at rest enabled`, 'info', { domainName, encryptionAtRest: true }, true),
            );
          }

          if (domain.NodeToNodeEncryptionOptions?.Enabled !== true) {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch node-to-node encryption is disabled', `Domain "${domainName}" does not have node-to-node encryption enabled`, 'high', { domainName, nodeToNodeEncryption: false }, false, `Use opensearch:UpdateDomainConfigCommand with NodeToNodeEncryptionOptions.Enabled set to true. Rollback by setting to false.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch node-to-node encryption is enabled', `Domain "${domainName}" has node-to-node encryption enabled`, 'info', { domainName, nodeToNodeEncryption: true }, true),
            );
          }

          const vpcOptions = domain.VPCOptions;
          const hasVpc =
            vpcOptions &&
            ((vpcOptions.SubnetIds ?? []).length > 0 ||
              (vpcOptions.SecurityGroupIds ?? []).length > 0);

          if (!hasVpc) {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch domain is publicly accessible', `Domain "${domainName}" is not deployed within a VPC and may be publicly accessible`, 'high', { domainName, vpcConfigured: false }, false, `[MANUAL] Cannot be auto-fixed. Moving an OpenSearch domain into a VPC requires domain recreation.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch domain is in a VPC', `Domain "${domainName}" is deployed within a VPC`, 'info', { domainName, vpcConfigured: true }, true),
            );
          }

          if (domain.AdvancedSecurityOptions?.Enabled !== true) {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch fine-grained access control is disabled', `Domain "${domainName}" does not have advanced security options (fine-grained access control) enabled`, 'medium', { domainName, advancedSecurity: false }, false, `Use opensearch:UpdateDomainConfigCommand with AdvancedSecurityOptions.Enabled set to true. Requires HTTPS enforcement.`),
            );
          } else {
            findings.push(
              this.makeFinding(resourceId, 'OpenSearch fine-grained access control is enabled', `Domain "${domainName}" has advanced security options enabled`, 'info', { domainName, advancedSecurity: true }, true),
            );
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.includes('ResourceNotFoundException')) continue;
          throw error;
        }
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
    remediation?: string,
  ): SecurityFinding {
    const id = `opensearch-${resourceId}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title,
      description,
      severity,
      resourceType: 'AwsOpenSearchDomain',
      resourceId,
      remediation,
      evidence: { ...evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed,
    };
  }
}

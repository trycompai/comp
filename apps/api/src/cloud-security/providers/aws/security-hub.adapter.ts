import {
  GetFindingsCommand,
  SecurityHubClient,
  type GetFindingsCommandInput,
} from '@aws-sdk/client-securityhub';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class SecurityHubAdapter implements AwsServiceAdapter {
  readonly serviceId = 'security-hub';
  readonly isGlobal = false;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region } = params;

    const securityHub = new SecurityHubClient({ region, credentials });

    try {
      return await this.fetchFindings(securityHub, region);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('not subscribed') || msg.includes('AccessDenied')) {
        return [];
      }
      throw error;
    }
  }

  private async fetchFindings(
    client: SecurityHubClient,
    region: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const params: GetFindingsCommandInput = {
      Filters: {
        WorkflowStatus: [
          { Value: 'NEW', Comparison: 'EQUALS' },
          { Value: 'NOTIFIED', Comparison: 'EQUALS' },
        ],
        RecordState: [{ Value: 'ACTIVE', Comparison: 'EQUALS' }],
      },
      MaxResults: 100,
    };

    let response = await client.send(new GetFindingsCommand(params));

    if (response.Findings) {
      for (const f of response.Findings) {
        findings.push(this.mapFinding(f, region));
      }
    }

    let nextToken = response.NextToken;
    while (nextToken && findings.length < 500) {
      response = await client.send(
        new GetFindingsCommand({ ...params, NextToken: nextToken }),
      );

      if (response.Findings) {
        for (const f of response.Findings) {
          if (findings.length >= 500) break;
          findings.push(this.mapFinding(f, region));
        }
      }

      nextToken = response.NextToken;
    }

    return findings;
  }

  private mapFinding(
    finding: {
      Id?: string;
      Title?: string;
      Description?: string;
      Remediation?: { Recommendation?: { Text?: string } };
      Severity?: { Label?: string };
      Resources?: Array<{ Type?: string; Id?: string }>;
      AwsAccountId?: string;
      Region?: string;
      Compliance?: { Status?: string };
      GeneratorId?: string;
      CreatedAt?: string;
      UpdatedAt?: string;
    },
    scanRegion: string,
  ): SecurityFinding {
    const severityMap: Record<string, SecurityFinding['severity']> = {
      INFORMATIONAL: 'info',
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    };

    const complianceStatus = finding.Compliance?.Status;
    const passed = complianceStatus === 'PASSED';
    const findingRegion = finding.Region || scanRegion;
    const baseTitle = finding.Title || 'Untitled Finding';

    return {
      id: finding.Id || '',
      title: `${baseTitle} (${findingRegion})`,
      description: finding.Description || 'No description available',
      severity: severityMap[finding.Severity?.Label || 'INFO'] || 'medium',
      resourceType: finding.Resources?.[0]?.Type || 'unknown',
      resourceId: finding.Resources?.[0]?.Id || 'unknown',
      remediation:
        finding.Remediation?.Recommendation?.Text || 'No remediation available',
      evidence: {
        awsAccountId: finding.AwsAccountId,
        region: findingRegion,
        complianceStatus,
        generatorId: finding.GeneratorId,
        updatedAt: finding.UpdatedAt,
      },
      createdAt: finding.CreatedAt || new Date().toISOString(),
      passed,
    };
  }
}

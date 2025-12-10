import { Injectable, Logger } from '@nestjs/common';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import {
  GetFindingsCommand,
  SecurityHubClient,
  type GetFindingsCommandInput,
} from '@aws-sdk/client-securityhub';
import type { SecurityFinding } from '../cloud-security.service';

@Injectable()
export class AWSSecurityService {
  private readonly logger = new Logger(AWSSecurityService.name);

  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): Promise<SecurityFinding[]> {
    // Determine auth method
    const isRoleAuth = credentials.roleArn && credentials.externalId;
    const isKeyAuth =
      credentials.access_key_id && credentials.secret_access_key;

    if (!isRoleAuth && !isKeyAuth) {
      throw new Error(
        'AWS credentials missing. Provide IAM Role or Access Keys.',
      );
    }

    const region =
      (credentials.region as string) ||
      (variables.region as string) ||
      'us-east-1';

    let awsCredentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };

    if (isRoleAuth) {
      // IAM Role assumption
      const roleArn = credentials.roleArn as string;
      const externalId = credentials.externalId as string;

      this.logger.log(`Assuming role ${roleArn} in region ${region}`);

      const sts = new STSClient({ region });
      const assumeRoleResponse = await sts.send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          ExternalId: externalId,
          RoleSessionName: 'CompSecurityAudit',
          DurationSeconds: 3600,
        }),
      );

      if (!assumeRoleResponse.Credentials) {
        throw new Error('Failed to assume role - no credentials returned');
      }

      awsCredentials = {
        accessKeyId: assumeRoleResponse.Credentials.AccessKeyId!,
        secretAccessKey: assumeRoleResponse.Credentials.SecretAccessKey!,
        sessionToken: assumeRoleResponse.Credentials.SessionToken!,
      };
    } else {
      // Direct access keys
      awsCredentials = {
        accessKeyId: credentials.access_key_id as string,
        secretAccessKey: credentials.secret_access_key as string,
      };
    }

    // Create Security Hub client
    const securityHub = new SecurityHubClient({
      region,
      credentials: awsCredentials,
    });

    this.logger.log(`Scanning AWS Security Hub in region ${region}`);

    try {
      const findings = await this.fetchSecurityHubFindings(securityHub);
      this.logger.log(`Found ${findings.length} AWS security findings`);
      return findings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes('not subscribed') ||
        errorMessage.includes('AccessDenied')
      ) {
        this.logger.warn('Security Hub not enabled in this region');
        return [];
      }

      throw error;
    }
  }

  private async fetchSecurityHubFindings(
    securityHub: SecurityHubClient,
  ): Promise<SecurityFinding[]> {
    const allFindings: SecurityFinding[] = [];

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

    let response = await securityHub.send(new GetFindingsCommand(params));

    if (response.Findings) {
      for (const finding of response.Findings) {
        allFindings.push(this.mapFinding(finding));
      }
    }

    // Paginate
    let nextToken = response.NextToken;
    while (nextToken && allFindings.length < 500) {
      response = await securityHub.send(
        new GetFindingsCommand({
          ...params,
          NextToken: nextToken,
        }),
      );

      if (response.Findings) {
        for (const finding of response.Findings) {
          if (allFindings.length >= 500) break;
          allFindings.push(this.mapFinding(finding));
        }
      }

      nextToken = response.NextToken;
    }

    return allFindings;
  }

  private mapFinding(finding: {
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
  }): SecurityFinding {
    const severityMap: Record<string, SecurityFinding['severity']> = {
      INFORMATIONAL: 'info',
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    };

    const complianceStatus = finding.Compliance?.Status;
    const passed = complianceStatus === 'PASSED';

    return {
      id: finding.Id || '',
      title: finding.Title || 'Untitled Finding',
      description: finding.Description || 'No description available',
      severity: severityMap[finding.Severity?.Label || 'INFO'] || 'medium',
      resourceType: finding.Resources?.[0]?.Type || 'unknown',
      resourceId: finding.Resources?.[0]?.Id || 'unknown',
      remediation:
        finding.Remediation?.Recommendation?.Text || 'No remediation available',
      evidence: {
        awsAccountId: finding.AwsAccountId,
        region: finding.Region,
        complianceStatus,
        generatorId: finding.GeneratorId,
        updatedAt: finding.UpdatedAt,
      },
      createdAt: finding.CreatedAt || new Date().toISOString(),
      passed,
    };
  }
}

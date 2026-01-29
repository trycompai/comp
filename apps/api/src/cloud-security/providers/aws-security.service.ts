import { Injectable, Logger } from '@nestjs/common';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import {
  GetFindingsCommand,
  SecurityHubClient,
  type GetFindingsCommandInput,
} from '@aws-sdk/client-securityhub';
import type { SecurityFinding } from '../cloud-security.service';

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

@Injectable()
export class AWSSecurityService {
  private readonly logger = new Logger(AWSSecurityService.name);

  async scanSecurityFindings(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): Promise<SecurityFinding[]> {
    const isRoleAuth = Boolean(credentials.roleArn && credentials.externalId);
    const isKeyAuth = Boolean(
      credentials.access_key_id && credentials.secret_access_key,
    );

    if (!isRoleAuth && !isKeyAuth) {
      throw new Error(
        'AWS credentials missing. Provide IAM Role or Access Keys.',
      );
    }

    // Get all configured regions, or default to us-east-1
    const configuredRegions = this.getConfiguredRegions(credentials, variables);
    this.logger.log(
      `Scanning ${configuredRegions.length} region(s): ${configuredRegions.join(', ')}`,
    );

    const allFindings: SecurityFinding[] = [];

    // Scan each region
    for (const region of configuredRegions) {
      try {
        const regionFindings = await this.scanRegion(
          credentials,
          region,
          isRoleAuth,
          isKeyAuth,
        );
        allFindings.push(...regionFindings);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // Use warn - per-region failures are expected (e.g., Security Hub not enabled)
        this.logger.warn(`Error scanning region ${region}: ${errorMessage}`);
        // Continue with other regions
      }
    }

    this.logger.log(`Total findings across all regions: ${allFindings.length}`);
    return allFindings;
  }

  /**
   * Get the list of regions to scan from credentials or variables
   */
  private getConfiguredRegions(
    credentials: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): string[] {
    // Check credentials.regions (array from multi-select)
    if (Array.isArray(credentials.regions) && credentials.regions.length > 0) {
      return credentials.regions.filter(
        (r): r is string => typeof r === 'string',
      );
    }

    // Check variables.regions (array)
    if (Array.isArray(variables.regions) && variables.regions.length > 0) {
      return variables.regions.filter(
        (r): r is string => typeof r === 'string',
      );
    }

    // Check single region in credentials or variables
    const singleRegion =
      (credentials.region as string) || (variables.region as string);

    if (singleRegion && typeof singleRegion === 'string') {
      return [singleRegion];
    }

    // Default to us-east-1
    return ['us-east-1'];
  }

  /**
   * Scan a single AWS region for security findings
   */
  private async scanRegion(
    credentials: Record<string, unknown>,
    region: string,
    isRoleAuth: boolean,
    isKeyAuth: boolean,
  ): Promise<SecurityFinding[]> {
    let awsCredentials: AwsCredentials;

    if (isRoleAuth) {
      awsCredentials = await this.assumeRole(credentials, region);
    } else if (isKeyAuth) {
      awsCredentials = {
        accessKeyId: credentials.access_key_id as string,
        secretAccessKey: credentials.secret_access_key as string,
      };
    } else {
      throw new Error('No valid credentials');
    }

    const securityHub = new SecurityHubClient({
      region,
      credentials: awsCredentials,
    });

    try {
      const findings = await this.fetchSecurityHubFindings(securityHub, region);
      this.logger.log(`Found ${findings.length} findings in region ${region}`);
      return findings;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes('not subscribed') ||
        errorMessage.includes('AccessDenied')
      ) {
        this.logger.warn(`Security Hub not enabled in region ${region}`);
        return [];
      }

      throw error;
    }
  }

  /**
   * Assume IAM role for cross-account access
   */
  private async assumeRole(
    credentials: Record<string, unknown>,
    region: string,
  ): Promise<AwsCredentials> {
    const customerRoleArn = credentials.roleArn as string;
    const externalId = credentials.externalId as string;

    const roleAssumerArn = process.env.SECURITY_HUB_ROLE_ASSUMER_ARN;
    if (!roleAssumerArn) {
      throw new Error(
        'Missing SECURITY_HUB_ROLE_ASSUMER_ARN (our roleAssumer ARN).',
      );
    }

    // Hop 1: task role -> roleAssumer
    const baseSts = new STSClient({ region });
    const roleAssumerResp = await baseSts.send(
      new AssumeRoleCommand({
        RoleArn: roleAssumerArn,
        RoleSessionName: 'CompRoleAssumer',
        DurationSeconds: 3600,
      }),
    );

    const roleAssumerCreds = roleAssumerResp.Credentials;
    if (!roleAssumerCreds?.AccessKeyId || !roleAssumerCreds.SecretAccessKey) {
      throw new Error('Failed to assume roleAssumer - no credentials returned');
    }

    const roleAssumerAwsCreds: AwsCredentials = {
      accessKeyId: roleAssumerCreds.AccessKeyId,
      secretAccessKey: roleAssumerCreds.SecretAccessKey,
      sessionToken: roleAssumerCreds.SessionToken,
    };

    // Hop 2: roleAssumer -> customer role (ExternalId enforced by customer trust policy)
    const roleAssumerSts = new STSClient({
      region,
      credentials: roleAssumerAwsCreds,
    });

    this.logger.log(
      `Assuming customer role ${customerRoleArn} in region ${region}`,
    );

    const customerResp = await roleAssumerSts.send(
      new AssumeRoleCommand({
        RoleArn: customerRoleArn,
        ExternalId: externalId,
        RoleSessionName: 'CompSecurityAudit',
        DurationSeconds: 3600,
      }),
    );

    const customerCreds = customerResp.Credentials;
    if (!customerCreds?.AccessKeyId || !customerCreds.SecretAccessKey) {
      throw new Error(
        'Failed to assume customer role - no credentials returned',
      );
    }

    return {
      accessKeyId: customerCreds.AccessKeyId,
      secretAccessKey: customerCreds.SecretAccessKey,
      sessionToken: customerCreds.SessionToken,
    };
  }

  private async fetchSecurityHubFindings(
    securityHub: SecurityHubClient,
    region: string,
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
        allFindings.push(this.mapFinding(finding, region));
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
          allFindings.push(this.mapFinding(finding, region));
        }
      }

      nextToken = response.NextToken;
    }

    return allFindings;
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

    // Use the finding's region if available, otherwise use the scan region
    const findingRegion = finding.Region || scanRegion;

    // Append region to title for frontend filtering (e.g., "Finding Title (us-east-1)")
    const baseTitle = finding.Title || 'Untitled Finding';
    const titleWithRegion = `${baseTitle} (${findingRegion})`;

    return {
      id: finding.Id || '',
      title: titleWithRegion,
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

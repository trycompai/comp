import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  createAWSClients,
  getSecurityHubFindings,
  isRoleCredentials,
  type AWSCredentials,
} from '../helpers';

/**
 * AWS Security Hub Findings Check
 *
 * Fetches security findings from AWS Security Hub and reports them.
 * Supports both IAM Role (new) and Access Keys (legacy) authentication.
 */
export const securityHubCheck: IntegrationCheck = {
  id: 'security-hub-findings',
  name: 'Security Hub Findings',
  description: 'Fetch and report security findings from AWS Security Hub',
  defaultSeverity: 'medium',
  variables: [],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting AWS Security Hub findings check');

    // Detect which auth method is being used
    let credentials: AWSCredentials;
    let authMethod: string;

    if (ctx.credentials.roleArn && ctx.credentials.externalId) {
      // New method: IAM Role assumption
      credentials = {
        roleArn: ctx.credentials.roleArn,
        externalId: ctx.credentials.externalId,
        region: ctx.credentials.region || 'us-east-1',
      };
      authMethod = 'IAM Role';
    } else if (ctx.credentials.access_key_id && ctx.credentials.secret_access_key) {
      // Legacy method: Direct access keys
      credentials = {
        access_key_id: ctx.credentials.access_key_id,
        secret_access_key: ctx.credentials.secret_access_key,
        region: ctx.credentials.region || 'us-east-1',
      };
      authMethod = 'Access Keys';
    } else {
      ctx.fail({
        title: 'Missing AWS Credentials',
        resourceType: 'configuration',
        resourceId: 'aws-credentials',
        severity: 'critical',
        description:
          'AWS credentials missing. Provide IAM Role (roleArn, externalId) or Access Keys',
        remediation: 'Configure AWS credentials in the integration settings',
        evidence: {
          hasRoleArn: !!ctx.credentials.roleArn,
          hasExternalId: !!ctx.credentials.externalId,
          hasAccessKeyId: !!ctx.credentials.access_key_id,
          hasRegion: !!ctx.credentials.region,
        },
      });
      return;
    }

    ctx.log(`Using ${authMethod} authentication`);

    let aws;
    try {
      aws = await createAWSClients(credentials, ctx.log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const resourceId = isRoleCredentials(credentials)
        ? credentials.roleArn
        : `access-key-${credentials.access_key_id.slice(0, 8)}...`;

      ctx.fail({
        title: 'Failed to Connect to AWS',
        resourceType: 'connection',
        resourceId,
        severity: 'critical',
        description: `Could not connect to AWS: ${errorMessage}`,
        remediation: isRoleCredentials(credentials)
          ? 'Verify the IAM role exists and the trust policy is correct'
          : 'Verify access key credentials are valid',
        evidence: { error: String(error), authMethod },
      });
      return;
    }

    // Fetch Security Hub findings
    ctx.log('Fetching Security Hub findings...');
    let findings;
    try {
      findings = await getSecurityHubFindings(aws.securityHub, {
        maxResults: 100,
        onlyFailed: true,
      });
    } catch (error) {
      // Security Hub might not be enabled
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not subscribed') || errorMessage.includes('AccessDenied')) {
        ctx.pass({
          title: 'Security Hub Not Enabled',
          resourceType: 'security-hub',
          resourceId: `aws-${aws.region}`,
          description:
            'AWS Security Hub is not enabled in this region. Enable Security Hub to get security findings.',
          evidence: {
            region: aws.region,
            note: 'Security Hub must be enabled to fetch findings',
          },
        });
        return;
      }
      throw error;
    }

    ctx.log(`Found ${findings.length} Security Hub findings`);

    if (findings.length === 0) {
      ctx.pass({
        title: 'No Security Hub Findings',
        resourceType: 'security-hub',
        resourceId: `aws-${credentials.region}`,
        description: 'No failed compliance findings in AWS Security Hub',
        evidence: {
          region: credentials.region,
          checkedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // Report each finding
    for (const finding of findings) {
      // Map AWS severity labels to our severity levels
      const severityMap: Record<string, 'info' | 'low' | 'medium' | 'high' | 'critical'> = {
        informational: 'info',
        low: 'low',
        medium: 'medium',
        high: 'high',
        critical: 'critical',
      };
      const severity = severityMap[finding.severity.toLowerCase()] || 'medium';

      ctx.fail({
        title: finding.title,
        resourceType: finding.resourceType,
        resourceId: finding.resourceId,
        severity,
        description: finding.description,
        remediation: finding.remediation,
        evidence: {
          awsAccountId: finding.awsAccountId,
          region: finding.region,
          complianceStatus: finding.complianceStatus,
          generatorId: finding.generatorId,
          createdAt: finding.createdAt,
          updatedAt: finding.updatedAt,
          findingId: finding.id,
        },
      });
    }

    ctx.log('AWS Security Hub check complete');
  },
};

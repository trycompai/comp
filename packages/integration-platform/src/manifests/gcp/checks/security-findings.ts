import type { CheckContext, IntegrationCheck } from '../../../types';
import { createGCPClient, getSecurityFindings } from '../helpers';
import type { GCPCredentials } from '../types';

/**
 * GCP Security Command Centre Findings Check
 *
 * Fetches security findings from Security Command Centre and reports them.
 */
export const securityFindingsCheck: IntegrationCheck = {
  id: 'security-findings',
  name: 'Security Command Centre Findings',
  description: 'Fetch and report security findings from GCP Security Command Centre',
  defaultSeverity: 'medium',
  variables: [
    {
      id: 'organization_id',
      label: 'GCP Organization ID',
      helpText:
        'Your Google Cloud Organization ID (numeric, e.g., 123456789012). Find it in GCP Console → IAM & Admin → Settings, or run: gcloud organizations list',
      type: 'text',
      required: true,
      placeholder: '123456789012',
    },
    {
      id: 'include_inactive',
      label: 'Include Inactive Findings',
      helpText: 'Also fetch findings that have been marked as inactive',
      type: 'select',
      required: false,
      options: [
        { value: 'false', label: 'Active only' },
        { value: 'true', label: 'Include inactive' },
      ],
      default: 'false',
    },
  ],

  run: async (ctx: CheckContext) => {
    ctx.log('Starting GCP Security Command Centre findings check');

    const credentials = ctx.credentials as unknown as GCPCredentials;
    const organizationId = ctx.variables.organization_id as string;
    const includeInactive = ctx.variables.include_inactive === 'true';

    if (!organizationId) {
      ctx.fail({
        title: 'Missing Organization ID',
        resourceType: 'configuration',
        resourceId: 'gcp-config',
        severity: 'critical',
        description:
          'GCP Organization ID is required. Go to Manage → Configure the Organization ID variable.',
        remediation: 'Configure the Organization ID variable in the integration settings',
        evidence: {},
      });
      return;
    }

    // For OAuth, we don't need a project ID for Security Command Center
    // but we need to create a client with the access token
    let gcp;
    try {
      // Use a placeholder project ID since SCC is org-level
      gcp = createGCPClient(credentials, 'scc-check', ctx.log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ctx.fail({
        title: 'Failed to Connect to GCP',
        resourceType: 'connection',
        resourceId: 'gcp-auth',
        severity: 'critical',
        description: `Could not authenticate with GCP: ${errorMessage}`,
        remediation:
          'Verify your OAuth connection is valid. You may need to reconnect the integration.',
        evidence: { error: String(error) },
      });
      return;
    }

    // Build filter for findings
    const filters: string[] = [];
    if (!includeInactive) {
      filters.push('state="ACTIVE"');
    }

    ctx.log('Fetching Security Command Centre findings...');

    const allFindings: Array<{
      name: string;
      category: string;
      severity: string;
      state: string;
      resourceName: string;
      description?: string;
      createTime: string;
      eventTime: string;
    }> = [];

    try {
      let pageToken: string | undefined;
      do {
        const response = await getSecurityFindings(gcp, organizationId, {
          filter: filters.length > 0 ? filters.join(' AND ') : undefined,
          pageToken,
        });

        for (const result of response.findings) {
          allFindings.push(result.finding);
        }

        pageToken = response.nextPageToken;
      } while (pageToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ctx.log(`GCP API Error: ${errorMessage}`);

      // Check for scope insufficient error - user needs to reconnect
      if (
        errorMessage.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') ||
        errorMessage.includes('insufficient authentication scopes')
      ) {
        ctx.fail({
          title: 'Authentication Scopes Insufficient',
          resourceType: 'security-command-center',
          resourceId: `org-${organizationId}`,
          severity: 'high',
          description:
            'The OAuth connection does not have the required permissions to access Security Command Center.',
          remediation:
            'Please disconnect and reconnect the GCP integration. When reconnecting, make sure to approve all requested permissions in the Google consent screen.',
          evidence: { error: errorMessage },
        });
        return;
      }

      // Check for permission denied - user needs IAM role
      if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('403')) {
        ctx.fail({
          title: 'Permission Denied',
          resourceType: 'security-command-center',
          resourceId: `org-${organizationId}`,
          severity: 'high',
          description:
            'Your Google account does not have permission to access Security Command Center.',
          remediation:
            'Grant the "Security Center Findings Viewer" role to your Google account at the ORGANIZATION level (not project level). Go to IAM & Admin > IAM in GCP Console, switch to organization scope using the dropdown, then click Grant Access and add the role.',
          evidence: { error: errorMessage },
        });
        return;
      }

      if (errorMessage.includes('Security Command Centre') || errorMessage.includes('SCC')) {
        ctx.pass({
          title: 'Security Command Centre Not Enabled',
          resourceType: 'security-command-center',
          resourceId: `org-${organizationId}`,
          description:
            'Security Command Centre may not be enabled for this organization. Enable it to get security findings.',
          evidence: {
            organizationId,
            note: 'Security Command Centre must be enabled at the organization level',
          },
        });
        return;
      }

      // Handle any other API errors
      ctx.fail({
        title: 'Failed to Fetch Security Findings',
        resourceType: 'security-command-center',
        resourceId: `org-${organizationId}`,
        severity: 'high',
        description: 'An error occurred while fetching security findings from GCP.',
        remediation:
          'Verify the organization ID is correct and your account has the Security Center Findings Viewer role at the organization level. If the problem persists, try disconnecting and reconnecting the integration.',
        evidence: {
          organizationId,
          error: errorMessage,
        },
      });
      return;
    }

    ctx.log(`Found ${allFindings.length} Security Command Centre findings`);

    if (allFindings.length === 0) {
      ctx.pass({
        title: 'No Security Findings',
        resourceType: 'security-command-center',
        resourceId: `org-${organizationId}`,
        description: 'No active security findings in GCP Security Command Centre',
        evidence: {
          organizationId,
          checkedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // Report each finding
    for (const finding of allFindings) {
      // Map GCP severity to our severity levels
      const severityMap: Record<string, 'info' | 'low' | 'medium' | 'high' | 'critical'> = {
        CRITICAL: 'critical',
        HIGH: 'high',
        MEDIUM: 'medium',
        LOW: 'low',
      };
      const severity = severityMap[finding.severity] || 'medium';

      ctx.fail({
        title: finding.category,
        resourceType: 'gcp-resource',
        resourceId: finding.resourceName,
        severity,
        description: finding.description || `Security finding: ${finding.category}`,
        remediation: `Review and remediate this finding in GCP Security Command Centre`,
        evidence: {
          findingName: finding.name,
          category: finding.category,
          state: finding.state,
          resourceName: finding.resourceName,
          severity: finding.severity,
          createdAt: finding.createTime,
          eventTime: finding.eventTime,
        },
      });
    }

    ctx.log('GCP Security Command Centre check complete');
  },
};

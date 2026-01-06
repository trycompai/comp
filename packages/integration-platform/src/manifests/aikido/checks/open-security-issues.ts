/**
 * Open Security Issues Check
 *
 * Verifies that there are no open high/critical security issues in Aikido.
 * This check monitors for vulnerabilities across code, dependencies, containers, and cloud.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { AikidoSeverity } from '../types';
import { includeSnoozedVariable, severityThresholdVariable } from '../variables';

interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  all?: number;
}

interface IssueCountsResponse {
  issue_groups?: SeverityCounts;
  issues?: SeverityCounts;
  // Direct counts if API returns flat structure
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
}

/**
 * Calculate the count of issues at or above the severity threshold.
 */
const countAtOrAboveSeverity = (counts: SeverityCounts, threshold: AikidoSeverity): number => {
  switch (threshold) {
    case 'critical':
      return counts.critical;
    case 'high':
      return counts.critical + counts.high;
    case 'medium':
      return counts.critical + counts.high + counts.medium;
    case 'low':
    default:
      return counts.critical + counts.high + counts.medium + counts.low;
  }
};

/**
 * Extract severity counts from API response, handling different formats
 */
const extractCounts = (response: IssueCountsResponse): SeverityCounts => {
  return (
    response.issue_groups ??
    response.issues ?? {
      critical: response.critical ?? 0,
      high: response.high ?? 0,
      medium: response.medium ?? 0,
      low: response.low ?? 0,
    }
  );
};

/**
 * Combine two severity count objects by summing each level
 */
const combineCounts = (a: SeverityCounts, b: SeverityCounts): SeverityCounts => ({
  critical: a.critical + b.critical,
  high: a.high + b.high,
  medium: a.medium + b.medium,
  low: a.low + b.low,
});

export const openSecurityIssuesCheck: IntegrationCheck = {
  id: 'open_security_issues',
  name: 'No Open Security Issues',
  description:
    'Verify that there are no open high or critical security vulnerabilities detected by Aikido',
  taskMapping: TASK_TEMPLATES.secureCode,
  defaultSeverity: 'high',

  variables: [severityThresholdVariable, includeSnoozedVariable],

  run: async (ctx) => {
    const severityThreshold = (ctx.variables.severity_threshold as AikidoSeverity) || 'high';
    const includeSnoozed = ctx.variables.include_snoozed === true;

    ctx.log(
      `Fetching issue counts from Aikido (threshold: ${severityThreshold}, include_snoozed: ${includeSnoozed})`,
    );

    // Aikido API: https://apidocs.aikido.dev/
    // Use issues/counts endpoint which returns counts by severity
    // Pass status parameter to filter by issue status
    const openResponse = await ctx.fetch<IssueCountsResponse>('issues/counts', {
      params: { status: 'open' },
    });

    ctx.log(`Open issues response: ${JSON.stringify(openResponse)}`);

    let counts = extractCounts(openResponse);

    // If include_snoozed is enabled, also fetch snoozed issues and combine
    if (includeSnoozed) {
      ctx.log('Fetching snoozed issues (include_snoozed is enabled)');
      try {
        const snoozedResponse = await ctx.fetch<IssueCountsResponse>('issues/counts', {
          params: { status: 'snoozed' },
        });
        ctx.log(`Snoozed issues response: ${JSON.stringify(snoozedResponse)}`);

        const snoozedCounts = extractCounts(snoozedResponse);
        counts = combineCounts(counts, snoozedCounts);

        ctx.log(
          `Combined counts (open + snoozed): critical=${counts.critical}, high=${counts.high}, medium=${counts.medium}, low=${counts.low}`,
        );
      } catch (error) {
        ctx.warn(`Failed to fetch snoozed issues: ${error}`);
        // Continue with just open issues if snoozed fetch fails
      }
    }

    ctx.log(
      `Issue counts: critical=${counts.critical}, high=${counts.high}, medium=${counts.medium}, low=${counts.low}`,
    );

    // Calculate total issues at or above threshold
    const issueCount = countAtOrAboveSeverity(counts, severityThreshold);
    const severityLabel =
      severityThreshold === 'low' ? 'all severities' : `${severityThreshold} severity or above`;

    ctx.log(`Found ${issueCount} issues at ${severityLabel}`);

    const statusLabel = includeSnoozed ? 'open or snoozed' : 'open';

    if (issueCount === 0) {
      ctx.pass({
        title: 'No open security issues found',
        description: `No ${statusLabel} issues at ${severityLabel} were detected by Aikido.`,
        resourceType: 'workspace',
        resourceId: 'aikido-workspace',
        evidence: {
          severity_threshold: severityThreshold,
          include_snoozed: includeSnoozed,
          issues_above_threshold: 0,
          counts: {
            critical: counts.critical,
            high: counts.high,
            medium: counts.medium,
            low: counts.low,
          },
          checked_at: new Date().toISOString(),
        },
      });
      return;
    }

    // There are open issues - report as failure
    // Determine severity based on highest actual issue severity present
    const checkSeverity: AikidoSeverity =
      counts.critical > 0
        ? 'critical'
        : counts.high > 0
          ? 'high'
          : counts.medium > 0
            ? 'medium'
            : 'low';

    ctx.fail({
      title: `${issueCount} security issues require attention`,
      description: `Found ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low severity ${statusLabel} issues. Issues at ${severityLabel}: ${issueCount}`,
      resourceType: 'workspace',
      resourceId: 'aikido-issues',
      severity: checkSeverity,
      remediation: `1. Log into Aikido Security dashboard at https://app.aikido.dev
2. Review and prioritize the ${issueCount} ${statusLabel} issues
3. Address critical and high severity issues first
4. Apply recommended fixes and re-scan affected repositories`,
      evidence: {
        severity_threshold: severityThreshold,
        include_snoozed: includeSnoozed,
        issues_above_threshold: issueCount,
        counts: {
          critical: counts.critical,
          high: counts.high,
          medium: counts.medium,
          low: counts.low,
        },
        checked_at: new Date().toISOString(),
      },
    });
  },
};

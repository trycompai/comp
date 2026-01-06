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

    ctx.log(`Fetching issue counts from Aikido (threshold: ${severityThreshold})`);

    // Aikido API: https://apidocs.aikido.dev/
    // Use issues/counts endpoint which returns counts by severity
    const response = await ctx.fetch<IssueCountsResponse>('issues/counts');

    ctx.log(`Response: ${JSON.stringify(response)}`);

    // Extract counts - handle different response formats
    const counts: SeverityCounts = response.issue_groups ??
      response.issues ?? {
        critical: response.critical ?? 0,
        high: response.high ?? 0,
        medium: response.medium ?? 0,
        low: response.low ?? 0,
      };

    ctx.log(
      `Issue counts: critical=${counts.critical}, high=${counts.high}, medium=${counts.medium}, low=${counts.low}`,
    );

    // Calculate total issues at or above threshold
    const issueCount = countAtOrAboveSeverity(counts, severityThreshold);
    const severityLabel =
      severityThreshold === 'low' ? 'all severities' : `${severityThreshold} severity or above`;

    ctx.log(`Found ${issueCount} issues at ${severityLabel}`);

    if (issueCount === 0) {
      ctx.pass({
        title: 'No open security issues found',
        description: `No open issues at ${severityLabel} were detected by Aikido.`,
        resourceType: 'workspace',
        resourceId: 'aikido-workspace',
        evidence: {
          severity_threshold: severityThreshold,
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
    const checkSeverity = counts.critical > 0 ? 'critical' : 'high';

    ctx.fail({
      title: `${issueCount} security issues require attention`,
      description: `Found ${counts.critical} critical, ${counts.high} high, ${counts.medium} medium, ${counts.low} low severity issues. Issues at ${severityLabel}: ${issueCount}`,
      resourceType: 'workspace',
      resourceId: 'aikido-issues',
      severity: checkSeverity,
      remediation: `1. Log into Aikido Security dashboard at https://app.aikido.dev
2. Review and prioritize the ${issueCount} open issues
3. Address critical and high severity issues first
4. Apply recommended fixes and re-scan affected repositories`,
      evidence: {
        severity_threshold: severityThreshold,
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

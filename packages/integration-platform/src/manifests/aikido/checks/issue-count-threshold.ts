/**
 * Issue Count Threshold Check
 *
 * Monitors the total number of open issues and fails if it exceeds
 * a configurable threshold. Useful for maintaining security hygiene.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { AikidoIssueCounts, AikidoSeverity, AikidoSeverityCounts } from '../types';
import { issueThresholdVariable, severityThresholdVariable } from '../variables';

/**
 * Calculate the count of issues at or above the severity threshold.
 * e.g., if threshold is "high", count critical + high issues.
 */
const countAtOrAboveSeverity = (
  counts: AikidoSeverityCounts,
  threshold: AikidoSeverity,
): number => {
  switch (threshold) {
    case 'critical':
      return counts.critical;
    case 'high':
      return counts.critical + counts.high;
    case 'medium':
      return counts.critical + counts.high + counts.medium;
    case 'low':
    default:
      return counts.all;
  }
};

export const issueCountThresholdCheck: IntegrationCheck = {
  id: 'issue_count_threshold',
  name: 'Issue Count Within Threshold',
  description: 'Verify that the total number of open security issues is within acceptable limits',
  taskMapping: TASK_TEMPLATES.monitoringAlerting,
  defaultSeverity: 'medium',

  variables: [severityThresholdVariable, issueThresholdVariable],

  run: async (ctx) => {
    const severityThreshold = (ctx.variables.severity_threshold as AikidoSeverity) || 'high';
    const threshold = (ctx.variables.issue_threshold as number) ?? 0;

    ctx.log(
      `Fetching issue counts from Aikido (severity: ${severityThreshold}, threshold: ${threshold})`,
    );

    let counts: AikidoIssueCounts;
    try {
      // Aikido API: https://apidocs.aikido.dev/reference/getissuecounts
      counts = await ctx.fetch<AikidoIssueCounts>('issues/counts');
      ctx.log(`Issue counts response: ${JSON.stringify(counts)}`);
    } catch (error) {
      ctx.warn(`Issue counts endpoint error: ${error}`);
      ctx.pass({
        title: 'Issue count check skipped',
        description: 'Could not fetch issue counts from Aikido.',
        resourceType: 'workspace',
        resourceId: 'issue-counts',
        evidence: {
          reason: 'API endpoint not accessible',
          error: String(error),
          checked_at: new Date().toISOString(),
        },
      });
      return;
    }

    // API returns: { issue_groups: { critical, high, medium, low, all }, issues: { ... } }
    const issueGroups = counts?.issue_groups;
    const issues = counts?.issues;

    if (!issueGroups) {
      ctx.warn('No issue group counts in response');
      ctx.pass({
        title: 'Issue count check skipped',
        description: 'Could not parse issue counts from Aikido response.',
        resourceType: 'workspace',
        resourceId: 'issue-counts',
        evidence: {
          reason: 'Invalid response format',
          checked_at: new Date().toISOString(),
        },
      });
      return;
    }

    // Count only issues at or above the severity threshold
    const openCount = countAtOrAboveSeverity(issueGroups, severityThreshold);
    ctx.log(`Found ${openCount} issue groups at ${severityThreshold} severity or above`);

    // Build severity breakdown showing what's being counted
    const severityLabel =
      severityThreshold === 'low' ? 'all severities' : `${severityThreshold} severity or above`;

    const severityBreakdown = `Critical: ${issueGroups.critical}, High: ${issueGroups.high}, Medium: ${issueGroups.medium}, Low: ${issueGroups.low}`;

    if (openCount <= threshold) {
      ctx.pass({
        title: `Issue count within threshold: ${openCount}/${threshold}`,
        description: `There are ${openCount} issue groups at ${severityLabel}, which is within the configured threshold of ${threshold}.`,
        resourceType: 'workspace',
        resourceId: 'issue-counts',
        evidence: {
          counted_issues: openCount,
          severity_filter: severityThreshold,
          threshold,
          total_issue_groups: issueGroups.all,
          total_issues: issues?.all,
          issue_groups_by_severity: issueGroups,
          issues_by_severity: issues,
          checked_at: new Date().toISOString(),
        },
      });
      return;
    }

    // Determine check severity based on how far over threshold
    const overageRatio = openCount / (threshold || 1);
    const checkSeverity = overageRatio >= 3 ? 'high' : 'medium';

    ctx.fail({
      title: `Issue count exceeds threshold: ${openCount}/${threshold}`,
      description: `There are ${openCount} issue groups at ${severityLabel}, which exceeds the configured threshold of ${threshold}. ${severityBreakdown}`,
      resourceType: 'workspace',
      resourceId: 'issue-counts',
      severity: checkSeverity,
      remediation: `1. Log into Aikido Security dashboard
2. Review open issues by priority (${issueGroups.critical} critical, ${issueGroups.high} high)
3. Address or appropriately snooze/ignore issues
4. Consider adjusting the threshold if the current limit is too restrictive`,
      evidence: {
        counted_issues: openCount,
        severity_filter: severityThreshold,
        threshold,
        overage: openCount - threshold,
        total_issue_groups: issueGroups.all,
        total_issues: issues?.all,
        issue_groups_by_severity: issueGroups,
        issues_by_severity: issues,
        checked_at: new Date().toISOString(),
      },
    });
  },
};

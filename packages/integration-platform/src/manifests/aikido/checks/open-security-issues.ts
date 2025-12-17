/**
 * Open Security Issues Check
 *
 * Verifies that there are no open high/critical security issues in Aikido.
 * This check monitors for vulnerabilities across code, dependencies, containers, and cloud.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { AikidoIssueGroup, AikidoIssueGroupsResponse, AikidoSeverity } from '../types';
import { includeSnoozedVariable, severityThresholdVariable } from '../variables';

const SEVERITY_ORDER: Record<AikidoSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const meetsThreshold = (issue: AikidoIssueGroup, threshold: AikidoSeverity): boolean => {
  const issueSeverity = issue.severity_score;
  return SEVERITY_ORDER[issueSeverity] >= SEVERITY_ORDER[threshold];
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
    const includeSnoozed = ctx.variables.include_snoozed as boolean;

    ctx.log(`Fetching open issue groups from Aikido (threshold: ${severityThreshold})`);

    // Aikido API uses open-issue-groups endpoint (no leading slash for URL constructor)
    // API returns an array directly, not wrapped in an object
    const response = await ctx.fetch<AikidoIssueGroup[] | AikidoIssueGroupsResponse>(
      'open-issue-groups',
      {
        params: { per_page: '100' },
      },
    );

    // Handle both array response and object response formats
    let issueGroups: AikidoIssueGroup[];
    if (Array.isArray(response)) {
      // API returns array directly
      issueGroups = response;
    } else {
      // API returns object with groups/issue_groups key
      issueGroups = response.groups ?? response.issue_groups ?? [];
    }
    ctx.log(`Found ${issueGroups.length} open issue groups`);

    // Snoozed issues would need a different endpoint if supported
    const snoozedGroups: AikidoIssueGroup[] = [];
    if (includeSnoozed) {
      ctx.log('Note: Snoozed issues are not included in this check');
    }

    const allIssues = [...issueGroups, ...snoozedGroups];

    // Filter issues that meet the severity threshold
    const relevantIssues = allIssues.filter((issue) => meetsThreshold(issue, severityThreshold));

    if (relevantIssues.length === 0) {
      ctx.pass({
        title: 'No open security issues found',
        description: `No open issues at ${severityThreshold} severity or above were detected by Aikido.`,
        resourceType: 'workspace',
        resourceId: 'aikido-workspace',
        evidence: {
          severity_threshold: severityThreshold,
          total_open_issues: issueGroups.length,
          total_snoozed_issues: snoozedGroups.length,
          issues_above_threshold: 0,
          checked_at: new Date().toISOString(),
        },
      });
      return;
    }

    // Group issues by severity for reporting
    const bySeverity = {
      critical: relevantIssues.filter((i) => i.severity_score === 'critical'),
      high: relevantIssues.filter((i) => i.severity_score === 'high'),
      medium: relevantIssues.filter((i) => i.severity_score === 'medium'),
      low: relevantIssues.filter((i) => i.severity_score === 'low'),
    };

    // Report each issue group as a finding
    for (const issue of relevantIssues) {
      const fixedVersion = issue.patched_versions?.[0];
      const remediation = fixedVersion
        ? `Update ${issue.affected_package} to version ${fixedVersion}`
        : 'Review the issue in Aikido and apply the recommended fix';

      const cweInfo = issue.cwe_classes?.length ? `CWE: ${issue.cwe_classes.join(', ')}` : '';

      ctx.fail({
        title: `${issue.severity_score.toUpperCase()}: ${issue.rule}`,
        description: `${issue.type} issue${issue.affected_file ? ` in ${issue.affected_file}` : ''}. ${cweInfo}`,
        resourceType: issue.type,
        resourceId: String(issue.id),
        severity: issue.severity_score === 'critical' ? 'critical' : 'high',
        remediation: `1. Go to Aikido dashboard and review issue: ${issue.rule}
2. ${remediation}
3. Re-scan to verify the fix`,
        evidence: {
          issue_id: issue.id,
          group_id: issue.group_id,
          type: issue.type,
          severity: issue.severity_score,
          severity_score_numeric: issue.severity,
          cwe_classes: issue.cwe_classes,
          affected_package: issue.affected_package,
          affected_file: issue.affected_file,
          current_version: issue.installed_version,
          patched_versions: issue.patched_versions,
          first_detected: issue.first_detected_at,
          code_repo_name: issue.code_repo_name,
          attack_surface: issue.attack_surface,
        },
      });
    }

    // Add summary finding
    ctx.fail({
      title: `${relevantIssues.length} security issues require attention`,
      description: `Found ${bySeverity.critical.length} critical, ${bySeverity.high.length} high, ${bySeverity.medium.length} medium, ${bySeverity.low.length} low severity issues.`,
      resourceType: 'workspace',
      resourceId: 'aikido-summary',
      severity: bySeverity.critical.length > 0 ? 'critical' : 'high',
      remediation:
        '1. Log into Aikido Security dashboard\n2. Review and prioritize open issues\n3. Apply recommended fixes\n4. Re-scan affected repositories',
    });
  },
};

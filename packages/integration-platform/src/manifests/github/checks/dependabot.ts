/**
 * Dependabot Check
 * Verifies that Dependabot security updates are enabled on repositories
 * and reports the count of open/closed security alerts.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubDependabotAlert, GitHubOrg, GitHubRepo } from '../types';
import { targetReposVariable } from '../variables';

interface AlertCounts {
  open: number;
  dismissed: number;
  fixed: number;
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export const dependabotCheck: IntegrationCheck = {
  id: 'dependabot_enabled',
  name: 'Dependabot Security Updates Enabled',
  description: 'Verify that Dependabot security updates are enabled on repositories',
  taskMapping: TASK_TEMPLATES.secureCode,
  defaultSeverity: 'medium',

  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetRepos = ctx.variables.target_repos as string[] | undefined;

    let repos: GitHubRepo[];

    if (targetRepos && targetRepos.length > 0) {
      repos = [];
      for (const repoName of targetRepos) {
        try {
          const repo = await ctx.fetch<GitHubRepo>(`/repos/${repoName}`);
          repos.push(repo);
        } catch {
          ctx.warn(`Could not fetch repo ${repoName}`);
        }
      }
    } else {
      const orgs = await ctx.fetch<GitHubOrg[]>('/user/orgs');
      repos = [];
      for (const org of orgs) {
        const orgRepos = await ctx.fetchAllPages<GitHubRepo>(`/orgs/${org.login}/repos`);
        repos.push(...orgRepos);
      }
    }

    ctx.log(`Checking ${repos.length} repositories for Dependabot`);

    /**
     * Fetch Dependabot alerts for a repository and calculate counts
     */
    const fetchAlertCounts = async (repoFullName: string): Promise<AlertCounts | null> => {
      try {
        const alerts = await ctx.fetchAllPages<GitHubDependabotAlert>(
          `/repos/${repoFullName}/dependabot/alerts`,
        );

        const counts: AlertCounts = {
          open: 0,
          dismissed: 0,
          fixed: 0,
          total: alerts.length,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        };

        for (const alert of alerts) {
          // Count by state
          if (alert.state === 'open') counts.open++;
          else if (alert.state === 'dismissed') counts.dismissed++;
          else if (alert.state === 'fixed') counts.fixed++;

          // Count open alerts by severity
          if (alert.state === 'open') {
            const severity = alert.security_vulnerability?.severity ?? 'low';
            counts.bySeverity[severity]++;
          }
        }

        return counts;
      } catch (error) {
        const errorStr = String(error);
        // 403 usually means Dependabot alerts are not enabled or no permission
        if (errorStr.includes('403') || errorStr.includes('Forbidden')) {
          ctx.log(`Cannot access Dependabot alerts for ${repoFullName} (permission denied)`);
          return null;
        }
        ctx.warn(`Failed to fetch Dependabot alerts for ${repoFullName}: ${errorStr}`);
        return null;
      }
    };

    /**
     * Format alert counts for display
     */
    const formatAlertSummary = (counts: AlertCounts): string => {
      const parts: string[] = [];

      if (counts.open > 0) {
        const severityBreakdown: string[] = [];
        if (counts.bySeverity.critical > 0)
          severityBreakdown.push(`${counts.bySeverity.critical} critical`);
        if (counts.bySeverity.high > 0) severityBreakdown.push(`${counts.bySeverity.high} high`);
        if (counts.bySeverity.medium > 0)
          severityBreakdown.push(`${counts.bySeverity.medium} medium`);
        if (counts.bySeverity.low > 0) severityBreakdown.push(`${counts.bySeverity.low} low`);

        parts.push(`${counts.open} open (${severityBreakdown.join(', ')})`);
      } else {
        parts.push('0 open');
      }

      parts.push(`${counts.fixed} fixed`);
      parts.push(`${counts.dismissed} dismissed`);

      return parts.join(', ');
    };

    for (const repo of repos) {
      const dependabotStatus = repo.security_and_analysis?.dependabot_security_updates?.status;

      // Fetch alert counts regardless of Dependabot status
      const alertCounts = await fetchAlertCounts(repo.full_name);

      if (dependabotStatus === 'enabled') {
        const alertSummary = alertCounts
          ? `\n\nAlert Summary: ${formatAlertSummary(alertCounts)}`
          : '';

        ctx.pass({
          title: `Dependabot enabled on ${repo.name}`,
          description: `Dependabot security updates are enabled and will automatically create pull requests to fix vulnerable dependencies.${alertSummary}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            security_and_analysis: repo.security_and_analysis,
            ...(alertCounts && {
              alerts: {
                open: alertCounts.open,
                fixed: alertCounts.fixed,
                dismissed: alertCounts.dismissed,
                total: alertCounts.total,
                open_by_severity: alertCounts.bySeverity,
              },
            }),
            checked_at: new Date().toISOString(),
          },
        });
      } else {
        const alertSummary = alertCounts
          ? `\n\nAlert Summary: ${formatAlertSummary(alertCounts)}`
          : '';

        ctx.fail({
          title: `Dependabot not enabled on ${repo.name}`,
          description: `Dependabot security updates are not enabled, leaving the repository vulnerable to known dependency exploits.${alertSummary}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation: `1. Go to ${repo.html_url}/settings/security_analysis\n2. Enable "Dependabot security updates"\n3. Optionally enable "Dependabot version updates" for proactive updates`,
          evidence: alertCounts
            ? {
                alerts: {
                  open: alertCounts.open,
                  fixed: alertCounts.fixed,
                  dismissed: alertCounts.dismissed,
                  total: alertCounts.total,
                  open_by_severity: alertCounts.bySeverity,
                },
              }
            : undefined,
        });
      }
    }
  },
};

/**
 * Dependabot Check
 * Verifies that Dependabot security updates are enabled on repositories
 * and reports the count of open/closed security alerts.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { GitHubDependabotAlert, GitHubOrg, GitHubRepo } from '../types';
import { parseRepoBranch, targetReposVariable } from '../variables';

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
  service: 'dependency-management',
  taskMapping: TASK_TEMPLATES.secureCode,
  defaultSeverity: 'medium',

  variables: [targetReposVariable],

  run: async (ctx) => {
    const targetReposRaw = ctx.variables.target_repos as string[] | undefined;
    // Extract just the repo names (values may be in "owner/repo:branch" format)
    const targetRepos = (targetReposRaw || []).map((v) => parseRepoBranch(v).repo);

    let repos: GitHubRepo[];

    if (targetRepos.length > 0) {
      repos = [];
      for (const repoName of targetRepos) {
        try {
          const repo = await ctx.fetch<GitHubRepo>(`/repos/${repoName}`);
          repos.push(repo);
        } catch {
          ctx.warn(`Could not fetch repo ${repoName}`);
          // Emit a fail result so the user knows this repo wasn't checked
          ctx.fail({
            title: `Repository not found: ${repoName}`,
            description: `Could not access repository "${repoName}". It may not exist or the integration lacks permission.`,
            resourceType: 'repository',
            resourceId: repoName,
            severity: 'medium',
            remediation: `Verify the repository name is correct (format: owner/repo) and that the GitHub integration has access to it.`,
            evidence: {
              [repoName]: {
                error: 'Repository not accessible',
                checked_at: new Date().toISOString(),
              },
            },
          });
        }
      }
    } else {
      const orgs = await ctx.fetch<GitHubOrg[]>('/user/orgs');
      repos = [];
      for (const org of orgs) {
        try {
          const orgRepos = await ctx.fetchAllPages<GitHubRepo>(`/orgs/${org.login}/repos`);
          repos.push(...orgRepos);
        } catch (error) {
          const errorStr = String(error);
          // Skip orgs with SAML SSO that haven't been authorized, or permission errors
          if (
            errorStr.includes('403') ||
            errorStr.includes('SAML') ||
            errorStr.includes('Forbidden')
          ) {
            ctx.log(`Skipping organization ${org.login} (SAML SSO or permission denied)`);
            continue;
          }
          throw error;
        }
      }
    }

    ctx.log(`Checking ${repos.length} repositories for Dependabot`);

    /**
     * Fetch Dependabot alerts for a repository and calculate counts
     */
    const fetchAlertCounts = async (repoFullName: string): Promise<AlertCounts | null> => {
      try {
        // GitHub supports filtering by state: open, fixed, dismissed (no "all")
        const [openAlerts, fixedAlerts, dismissedAlerts] = await Promise.all([
          ctx.fetchWithLinkHeader<GitHubDependabotAlert>(
            `/repos/${repoFullName}/dependabot/alerts`,
            {
              params: { state: 'open', per_page: '100' },
            },
          ),
          ctx.fetchWithLinkHeader<GitHubDependabotAlert>(
            `/repos/${repoFullName}/dependabot/alerts`,
            {
              params: { state: 'fixed', per_page: '100' },
            },
          ),
          ctx.fetchWithLinkHeader<GitHubDependabotAlert>(
            `/repos/${repoFullName}/dependabot/alerts`,
            { params: { state: 'dismissed', per_page: '100' } },
          ),
        ]);

        const counts: AlertCounts = {
          open: openAlerts.length,
          dismissed: dismissedAlerts.length,
          fixed: fixedAlerts.length,
          total: openAlerts.length + fixedAlerts.length + dismissedAlerts.length,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        };

        for (const alert of openAlerts) {
          const severity = alert.security_vulnerability?.severity ?? 'low';
          counts.bySeverity[severity]++;
        }

        return counts;
      } catch (error) {
        const errorStr = String(error);
        // 403 usually means Dependabot alerts are not enabled or no permission
        if (errorStr.includes('403') || errorStr.includes('Forbidden')) {
          ctx.log(`Cannot access Dependabot alerts for ${repoFullName} (permission denied)`);
          return null;
        }
        // 400 can mean Dependabot alerts endpoint isn't available for the repo/app
        if (errorStr.includes('400') || errorStr.includes('Bad Request')) {
          ctx.log(
            `Dependabot alerts not available for ${repoFullName} (feature may not be enabled)`,
          );
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
      // Use the dedicated endpoint to check Dependabot security updates status.
      // The security_and_analysis field on the repo object does not include
      // dependabot_security_updates — the correct endpoint is /automated-security-fixes.
      // status: 'enabled' | 'paused' | 'disabled' | 'unknown'
      let dependabotStatus: 'enabled' | 'paused' | 'disabled' | 'unknown' = 'unknown';
      try {
        const securityFixes = await ctx.fetch<{ enabled: boolean; paused: boolean }>(
          `/repos/${repo.full_name}/automated-security-fixes`,
        );
        if (securityFixes.enabled && securityFixes.paused) {
          dependabotStatus = 'paused';
        } else if (securityFixes.enabled) {
          dependabotStatus = 'enabled';
        } else {
          dependabotStatus = 'disabled';
        }
      } catch (error) {
        const errorStr = String(error);
        if (errorStr.includes('404')) {
          // 404 means Dependabot security updates are not enabled for this repo
          dependabotStatus = 'disabled';
        } else {
          // 403 or other errors mean we couldn't determine the status
          ctx.log(
            `Could not check Dependabot status for ${repo.full_name} (may lack admin access)`,
          );
        }
      }

      // Fetch alert counts regardless of Dependabot status
      const alertCounts = await fetchAlertCounts(repo.full_name);

      // Build hierarchical evidence: { "owner/repo": { data } }
      const repoEvidence: Record<string, unknown> = {
        dependabot_security_updates: { status: dependabotStatus },
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
      };

      const alertSummary = alertCounts
        ? `\n\nAlert Summary: ${formatAlertSummary(alertCounts)}`
        : '';

      if (dependabotStatus === 'enabled') {
        ctx.pass({
          title: `Dependabot enabled on ${repo.name}`,
          description: `Dependabot security updates are enabled and will automatically create pull requests to fix vulnerable dependencies.${alertSummary}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            [repo.full_name]: repoEvidence,
          },
        });
      } else if (dependabotStatus === 'paused') {
        ctx.pass({
          title: `Dependabot enabled on ${repo.name} (paused)`,
          description: `Dependabot security updates are enabled but currently paused due to inactivity. Dependabot will resume automatically when new alerts are detected.${alertSummary}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          evidence: {
            [repo.full_name]: repoEvidence,
          },
        });
      } else if (dependabotStatus === 'disabled') {
        ctx.fail({
          title: `Dependabot not enabled on ${repo.name}`,
          description: `Dependabot security updates are not enabled, leaving the repository vulnerable to known dependency exploits.${alertSummary}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation: `1. Go to ${repo.html_url}/settings/security_analysis\n2. Enable "Dependabot security updates"\n3. Optionally enable "Dependabot version updates" for proactive updates`,
          evidence: {
            [repo.full_name]: repoEvidence,
          },
        });
      } else {
        // Could not determine status (e.g., insufficient permissions)
        ctx.fail({
          title: `Unable to check Dependabot status on ${repo.name}`,
          description: `Could not determine whether Dependabot security updates are enabled. The GitHub integration may lack admin access to this repository.${alertSummary}`,
          resourceType: 'repository',
          resourceId: repo.full_name,
          severity: 'medium',
          remediation: `1. Ensure the GitHub integration has admin access to ${repo.full_name}\n2. Or manually verify at ${repo.html_url}/settings/security_analysis`,
          evidence: {
            [repo.full_name]: repoEvidence,
          },
        });
      }
    }
  },
};

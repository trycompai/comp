/**
 * Code Repository Scanning Check
 *
 * Verifies that all code repositories are actively being scanned by Aikido.
 * Ensures continuous security monitoring of the codebase.
 */

import { TASK_TEMPLATES } from '../../../task-mappings';
import type { IntegrationCheck } from '../../../types';
import type { AikidoCodeRepositoriesResponse, AikidoCodeRepository } from '../types';
import { targetRepositoriesVariable } from '../variables';

const SCAN_STALE_DAYS = 7; // Consider a scan stale after 7 days

const isStale = (lastScanAt: string | undefined): boolean => {
  if (!lastScanAt) return true;

  const lastScan = new Date(lastScanAt);
  const now = new Date();
  const diffDays = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60 * 24);

  return diffDays > SCAN_STALE_DAYS;
};

export const codeRepositoryScanningCheck: IntegrationCheck = {
  id: 'code_repository_scanning',
  name: 'Code Repositories Actively Scanned',
  description: 'Verify that all code repositories are being actively scanned for vulnerabilities',
  taskMapping: TASK_TEMPLATES.secureCode,
  defaultSeverity: 'medium',

  variables: [targetRepositoriesVariable],

  run: async (ctx) => {
    const targetRepoIds = ctx.variables.target_repositories as string[] | undefined;

    ctx.log('Fetching code repositories from Aikido');

    const response = await ctx.fetch<AikidoCodeRepositoriesResponse>('repositories/code', {
      params: { per_page: '100' },
    });

    let repos: AikidoCodeRepository[] = response.repositories || [];
    ctx.log(`Found ${repos.length} code repositories`);

    // Filter to target repos if specified
    if (targetRepoIds && targetRepoIds.length > 0) {
      repos = repos.filter((repo) => targetRepoIds.includes(repo.id));
      ctx.log(`Filtered to ${repos.length} target repositories`);
    }

    if (repos.length === 0) {
      ctx.fail({
        title: 'No code repositories connected',
        description:
          'No code repositories are connected to Aikido. Connect your repositories to enable security scanning.',
        resourceType: 'workspace',
        resourceId: 'aikido-repos',
        severity: 'high',
        remediation: `1. Go to Aikido > Repositories
2. Click "Add Repository" or connect your source control provider
3. Select the repositories you want to scan
4. Enable scanning for each repository`,
        evidence: {
          total_repos: 0,
          checked_at: new Date().toISOString(),
        },
      });
      return;
    }

    for (const repo of repos) {
      const stale = isStale(repo.last_scan_at);
      const inactive = !repo.is_active;
      const failed = repo.scan_status === 'failed';

      if (inactive) {
        ctx.fail({
          title: `Repository not active: ${repo.full_name}`,
          description: `The repository ${repo.full_name} is not activated for scanning in Aikido.`,
          resourceType: 'repository',
          resourceId: repo.id,
          severity: 'medium',
          remediation: `1. Go to Aikido > Repositories
2. Find ${repo.full_name}
3. Click "Activate" to enable scanning`,
          evidence: {
            repo_id: repo.id,
            name: repo.full_name,
            provider: repo.provider,
            is_active: repo.is_active,
            created_at: repo.created_at,
          },
        });
      } else if (failed) {
        ctx.fail({
          title: `Scan failed: ${repo.full_name}`,
          description: `The last scan for ${repo.full_name} failed.`,
          resourceType: 'repository',
          resourceId: repo.id,
          severity: 'high',
          remediation: `1. Go to Aikido > Repositories > ${repo.full_name}
2. Check scan logs for error details
3. Verify repository access and permissions
4. Retry the scan`,
          evidence: {
            repo_id: repo.id,
            name: repo.full_name,
            provider: repo.provider,
            scan_status: repo.scan_status,
            last_scan_at: repo.last_scan_at,
          },
        });
      } else if (stale) {
        ctx.fail({
          title: `Stale scan: ${repo.full_name}`,
          description: `Repository ${repo.full_name} hasn't been scanned in over ${SCAN_STALE_DAYS} days.`,
          resourceType: 'repository',
          resourceId: repo.id,
          severity: 'low',
          remediation: `1. Go to Aikido > Repositories > ${repo.full_name}
2. Click "Scan now" to trigger a new scan
3. Verify webhook integration for automatic scanning`,
          evidence: {
            repo_id: repo.id,
            name: repo.full_name,
            provider: repo.provider,
            last_scan_at: repo.last_scan_at,
            days_since_scan: repo.last_scan_at
              ? Math.floor(
                  (Date.now() - new Date(repo.last_scan_at).getTime()) / (1000 * 60 * 60 * 24),
                )
              : 'never',
          },
        });
      } else {
        ctx.pass({
          title: `Repository actively scanned: ${repo.full_name}`,
          description: `Repository ${repo.full_name} is active and has been scanned recently.`,
          resourceType: 'repository',
          resourceId: repo.id,
          evidence: {
            repo_id: repo.id,
            name: repo.full_name,
            provider: repo.provider,
            is_active: repo.is_active,
            scan_status: repo.scan_status,
            last_scan_at: repo.last_scan_at,
            issues_count: repo.issues_count,
            checked_at: new Date().toISOString(),
          },
        });
      }
    }
  },
};

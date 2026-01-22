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

/**
 * Check if a scan is stale based on unix timestamp or ISO string
 */
const isStale = (lastScannedAt: number | string | undefined): boolean => {
  if (!lastScannedAt) return true;

  // Handle both unix timestamp (number) and ISO string
  const lastScanMs =
    typeof lastScannedAt === 'number' ? lastScannedAt * 1000 : new Date(lastScannedAt).getTime();

  const diffDays = (Date.now() - lastScanMs) / (1000 * 60 * 60 * 24);
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

    // Aikido API: https://apidocs.aikido.dev/reference/listcoderepos
    // Note: The API returns a direct array without pagination support
    // Adding page/per_page params causes empty response
    const response = await ctx.fetch<AikidoCodeRepositoriesResponse | AikidoCodeRepository[]>(
      'repositories/code',
    );

    // Handle both array response and wrapped response formats
    const allRepos = Array.isArray(response) ? response : (response?.repositories ?? []);

    ctx.log(`Found ${allRepos.length} code repositories`);

    // Filter to target repos if specified
    let repos = allRepos;
    if (targetRepoIds && targetRepoIds.length > 0) {
      repos = allRepos.filter((repo) => targetRepoIds.includes(String(repo.id)));
      ctx.log(`Filtered to ${repos.length} target repositories`);
    }

    if (repos.length === 0) {
      // Differentiate between no repos connected vs filter mismatch
      if (targetRepoIds && targetRepoIds.length > 0 && allRepos.length > 0) {
        // Repositories exist but none match the target_repositories filter
        ctx.fail({
          title: 'No matching repositories found',
          description: `None of the ${targetRepoIds.length} specified target repository IDs match the ${allRepos.length} connected repositories. This may be due to typos, disconnected repositories, or incorrect IDs in the target_repositories configuration.`,
          resourceType: 'workspace',
          resourceId: 'aikido-repos',
          severity: 'high',
          remediation: `1. Verify the repository IDs in your target_repositories configuration
2. Go to Aikido > Repositories to find correct repository IDs
3. Check if the target repositories are still connected
4. Update the target_repositories variable with valid IDs
5. Or remove target_repositories to scan all connected repositories`,
          evidence: {
            target_repository_ids: targetRepoIds,
            connected_repository_count: allRepos.length,
            connected_repository_ids: allRepos.map((r) => String(r.id)),
            checked_at: new Date().toISOString(),
          },
        });
      } else {
        // No repositories connected at all
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
      }
      return;
    }

    for (const repo of repos) {
      // Use actual API field names: 'active', 'last_scanned_at', 'name'
      const stale = isStale(repo.last_scanned_at ?? repo.last_scan_at);
      const inactive = !(repo.active ?? repo.is_active);
      const failed = repo.scan_status === 'failed';
      const repoName = repo.name || repo.full_name || String(repo.id);

      if (inactive) {
        ctx.fail({
          title: `Repository not active: ${repoName}`,
          description: `The repository ${repoName} is not activated for scanning in Aikido.`,
          resourceType: 'repository',
          resourceId: String(repo.id),
          severity: 'medium',
          remediation: `1. Go to Aikido > Repositories
2. Find ${repoName}
3. Click "Activate" to enable scanning`,
          evidence: {
            repo_id: repo.id,
            name: repoName,
            provider: repo.provider,
            active: repo.active ?? repo.is_active,
          },
        });
      } else if (failed) {
        ctx.fail({
          title: `Scan failed: ${repoName}`,
          description: `The last scan for ${repoName} failed.`,
          resourceType: 'repository',
          resourceId: String(repo.id),
          severity: 'high',
          remediation: `1. Go to Aikido > Repositories > ${repoName}
2. Check scan logs for error details
3. Verify repository access and permissions
4. Retry the scan`,
          evidence: {
            repo_id: repo.id,
            name: repoName,
            provider: repo.provider,
            scan_status: repo.scan_status,
            last_scanned_at: repo.last_scanned_at,
          },
        });
      } else if (stale) {
        const lastScanMs = repo.last_scanned_at
          ? repo.last_scanned_at * 1000
          : repo.last_scan_at
            ? new Date(repo.last_scan_at).getTime()
            : null;
        const daysSinceScan = lastScanMs
          ? Math.floor((Date.now() - lastScanMs) / (1000 * 60 * 60 * 24))
          : 'never';

        ctx.fail({
          title: `Stale scan: ${repoName}`,
          description: `Repository ${repoName} hasn't been scanned in over ${SCAN_STALE_DAYS} days.`,
          resourceType: 'repository',
          resourceId: String(repo.id),
          severity: 'low',
          remediation: `1. Go to Aikido > Repositories > ${repoName}
2. Click "Scan now" to trigger a new scan
3. Verify webhook integration for automatic scanning`,
          evidence: {
            repo_id: repo.id,
            name: repoName,
            provider: repo.provider,
            last_scanned_at: repo.last_scanned_at,
            days_since_scan: daysSinceScan,
          },
        });
      } else {
        ctx.pass({
          title: `Repository actively scanned: ${repoName}`,
          description: `Repository ${repoName} is active and has been scanned recently.`,
          resourceType: 'repository',
          resourceId: String(repo.id),
          evidence: {
            repo_id: repo.id,
            name: repoName,
            provider: repo.provider,
            active: repo.active ?? repo.is_active,
            last_scanned_at: repo.last_scanned_at,
            checked_at: new Date().toISOString(),
          },
        });
      }
    }
  },
};

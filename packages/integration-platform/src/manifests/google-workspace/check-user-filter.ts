import { matchesSyncFilterTerms, parseSyncFilterTerms } from '../../sync-filter/email-exclusion-terms';
import type { CheckVariableValues } from '../../types';
import type { GoogleWorkspaceUser } from './types';

/** Sync mode for directory users — aligned with `sync_user_filter_mode` connection variables. */
export type GoogleWorkspaceUserSyncFilterMode = 'all' | 'exclude' | 'include';

/** Parsed filter state shared by GWS checks (2FA, employee access) and aligned with employee sync. */
export interface GoogleWorkspaceCheckUserFilterConfig {
  targetOrgUnits: string[] | undefined;
  excludedTerms: string[];
  includedTerms: string[];
  userFilterMode: GoogleWorkspaceUserSyncFilterMode | undefined;
  includeSuspended: boolean;
}

/**
 * Reads integration variables into a filter config (org units, sync email include/exclude).
 */
export function parseGoogleWorkspaceCheckUserFilter(
  variables: CheckVariableValues,
): GoogleWorkspaceCheckUserFilterConfig {
  return {
    targetOrgUnits: variables.target_org_units as string[] | undefined,
    excludedTerms: parseSyncFilterTerms(
      variables.sync_excluded_emails ?? variables.excluded_emails,
    ),
    includedTerms: parseSyncFilterTerms(variables.sync_included_emails),
    userFilterMode: variables.sync_user_filter_mode as GoogleWorkspaceUserSyncFilterMode | undefined,
    includeSuspended: variables.include_suspended === 'true',
  };
}

/**
 * Whether a directory user should be included in a GWS security check, using the same rules as
 * `sync.controller.ts` employee sync (OU first, then email terms).
 */
export function shouldIncludeGoogleWorkspaceUserForCheck(
  user: GoogleWorkspaceUser,
  config: GoogleWorkspaceCheckUserFilterConfig,
): boolean {
  if (user.suspended && !config.includeSuspended) {
    return false;
  }

  if (user.archived) {
    return false;
  }

  const { targetOrgUnits } = config;
  if (targetOrgUnits && targetOrgUnits.length > 0) {
    const userOu = user.orgUnitPath ?? '/';
    const inOrgUnit = targetOrgUnits.some(
      (ou) => ou === '/' || userOu === ou || userOu.startsWith(`${ou}/`),
    );
    if (!inOrgUnit) {
      return false;
    }
  }

  const email = user.primaryEmail.toLowerCase();

  if (config.userFilterMode === 'exclude' && config.excludedTerms.length > 0) {
    return !matchesSyncFilterTerms(email, config.excludedTerms);
  }

  if (config.userFilterMode === 'include') {
    if (config.includedTerms.length === 0) {
      return true;
    }
    return matchesSyncFilterTerms(email, config.includedTerms);
  }

  return true;
}

export function filterGoogleWorkspaceUsersForChecks(
  users: GoogleWorkspaceUser[],
  config: GoogleWorkspaceCheckUserFilterConfig,
): GoogleWorkspaceUser[] {
  return users.filter((user) => shouldIncludeGoogleWorkspaceUserForCheck(user, config));
}

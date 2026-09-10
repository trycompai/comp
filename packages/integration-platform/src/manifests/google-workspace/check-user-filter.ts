import { matchesSyncFilterTerms, parseSyncFilterTerms } from '../../sync-filter/email-exclusion-terms';
import type { CheckVariableValues } from '../../types';
import {
  fetchMemberIdsForGroups,
  type GoogleWorkspaceDirectoryClient,
} from './directory-client';

/**
 * The only fields user scoping actually reads.
 *
 * Callers hold different shapes for a directory user — the checks use the full
 * `GoogleWorkspaceUser`, employee sync keeps a narrower local interface — and
 * requiring the full shape here forced one of them to lie about its data.
 * Anything with these fields can be filtered.
 */
export interface GoogleWorkspaceFilterableUser {
  id: string;
  primaryEmail: string;
  orgUnitPath?: string;
  suspended?: boolean;
  archived?: boolean;
}

/** Read a variable that may arrive as a string or an array of strings. */
function toStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map((v) => String(v).trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return undefined;
}

/** Domain portion of an email, lowercased. */
function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

/** Sync mode for directory users — aligned with `sync_user_filter_mode` connection variables. */
export type GoogleWorkspaceUserSyncFilterMode = 'all' | 'exclude' | 'include';

/** Parsed filter state shared by GWS checks (2FA, employee access) and aligned with employee sync. */
export interface GoogleWorkspaceCheckUserFilterConfig {
  targetOrgUnits: string[] | undefined;
  excludedTerms: string[];
  includedTerms: string[];
  userFilterMode: GoogleWorkspaceUserSyncFilterMode | undefined;
  includeSuspended: boolean;
  /** Group ids/emails selected for filtering; undefined means no group filter. */
  targetGroups: string[] | undefined;
  /** Verified domains selected for filtering; undefined means no domain filter. */
  targetDomains: string[] | undefined;
  /**
   * Member ids of `targetGroups`, resolved by `resolveGoogleWorkspaceUserFilter`.
   * Undefined means the filter is not active; an empty set means it is active
   * and matched nobody.
   */
  targetGroupMemberIds: Set<string> | undefined;
}

/**
 * Reads integration variables into a filter config (org units, sync email include/exclude).
 */
export function parseGoogleWorkspaceCheckUserFilter(
  variables: CheckVariableValues,
): GoogleWorkspaceCheckUserFilterConfig {
  return {
    targetOrgUnits: Array.isArray(variables.target_org_units)
      ? variables.target_org_units
      : typeof variables.target_org_units === 'string'
        ? [variables.target_org_units]
        : undefined,
    excludedTerms: parseSyncFilterTerms(
      variables.sync_excluded_emails ?? variables.excluded_emails,
    ),
    includedTerms: parseSyncFilterTerms(variables.sync_included_emails),
    userFilterMode: variables.sync_user_filter_mode as GoogleWorkspaceUserSyncFilterMode | undefined,
    includeSuspended: variables.include_suspended === 'true',
    targetGroups: toStringList(variables.target_groups),
    targetDomains: toStringList(variables.target_domains),
    // Populated by resolveGoogleWorkspaceUserFilter; parsing stays synchronous
    // and pure so the filter itself remains trivially testable.
    targetGroupMemberIds: undefined,
  };
}

/**
 * Resolve the async part of the filter — expanding selected groups into member
 * ids. Call once per sync/check run, before filtering users.
 */
export async function resolveGoogleWorkspaceUserFilter({
  client,
  config,
}: {
  client: GoogleWorkspaceDirectoryClient;
  config: GoogleWorkspaceCheckUserFilterConfig;
}): Promise<GoogleWorkspaceCheckUserFilterConfig> {
  const targetGroupMemberIds = await fetchMemberIdsForGroups({
    client,
    groupIds: config.targetGroups,
  });
  return { ...config, targetGroupMemberIds };
}

/**
 * Stage 1 — is this user within the configured *scope* at all?
 *
 * Org unit, group membership, and domain. Deliberately says nothing about
 * suspended/archived: employee sync needs suspended users in scope so it can
 * drive offboarding, while security checks exclude them. Callers apply their
 * own activeness rule on top.
 */
export function isGoogleWorkspaceUserInScope(
  user: GoogleWorkspaceFilterableUser,
  config: GoogleWorkspaceCheckUserFilterConfig,
): boolean {
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

  const { targetDomains } = config;
  if (targetDomains && targetDomains.length > 0) {
    const domain = emailDomain(user.primaryEmail);
    const inDomain = targetDomains.some((d) => d.replace(/^@/, '').toLowerCase() === domain);
    if (!inDomain) {
      return false;
    }
  }

  // Group membership is resolved up front; an active-but-empty set correctly
  // excludes everyone rather than silently disabling the filter.
  if (config.targetGroupMemberIds && !config.targetGroupMemberIds.has(user.id)) {
    return false;
  }

  return true;
}

/**
 * The include/exclude mode actually in force.
 *
 * 'include' with an empty list falls back to 'all' so a half-configured filter
 * can never silently drop everyone.
 */
export function resolveEffectiveSyncFilterMode(
  config: GoogleWorkspaceCheckUserFilterConfig,
): GoogleWorkspaceUserSyncFilterMode {
  const mode = config.userFilterMode ?? 'all';
  if (mode === 'include' && config.includedTerms.length === 0) return 'all';
  return mode === 'exclude' || mode === 'include' ? mode : 'all';
}

/**
 * Stage 2 — does the email include/exclude selection pick this user?
 */
export function isGoogleWorkspaceUserSelectedBySyncTerms(
  user: GoogleWorkspaceFilterableUser,
  config: GoogleWorkspaceCheckUserFilterConfig,
): boolean {
  const email = user.primaryEmail.toLowerCase();
  const mode = resolveEffectiveSyncFilterMode(config);

  if (mode === 'exclude' && config.excludedTerms.length > 0) {
    return !matchesSyncFilterTerms(email, config.excludedTerms);
  }

  if (mode === 'include') {
    return matchesSyncFilterTerms(email, config.includedTerms);
  }

  return true;
}

/**
 * Whether a directory user should be included in a GWS security check —
 * scope, then activeness, then sync term selection.
 */
export function shouldIncludeGoogleWorkspaceUserForCheck(
  user: GoogleWorkspaceFilterableUser,
  config: GoogleWorkspaceCheckUserFilterConfig,
): boolean {
  if (user.suspended && !config.includeSuspended) {
    return false;
  }

  if (user.archived) {
    return false;
  }

  if (!isGoogleWorkspaceUserInScope(user, config)) {
    return false;
  }

  return isGoogleWorkspaceUserSelectedBySyncTerms(user, config);
}

export function filterGoogleWorkspaceUsersForChecks<
  T extends GoogleWorkspaceFilterableUser,
>(users: T[], config: GoogleWorkspaceCheckUserFilterConfig): T[] {
  return users.filter((user) => shouldIncludeGoogleWorkspaceUserForCheck(user, config));
}

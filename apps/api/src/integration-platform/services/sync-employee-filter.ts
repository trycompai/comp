import { parseSyncFilterTerms } from '@trycompai/integration-platform';

export type SyncUserFilterMode = 'all' | 'exclude' | 'include';

const SYNC_USER_FILTER_MODES = new Set<SyncUserFilterMode>([
  'all',
  'exclude',
  'include',
]);

export interface ResolvedSyncEmployeeFilter {
  mode: SyncUserFilterMode;
  excludedTerms: string[];
  includedTerms: string[];
}

/**
 * Resolve the org's configured employee sync filter from a connection's
 * `variables`.
 *
 * This mirrors the Google Workspace / JumpCloud sync filter so dynamic
 * providers (e.g. Microsoft Entra ID) honor the same connection variables:
 * - `sync_user_filter_mode`: 'all' | 'exclude' | 'include'
 * - `sync_excluded_emails`: terms to exclude (full emails, @domain, substrings)
 * - `sync_included_emails`: terms to include
 *
 * Falls back to 'all' (import everyone) when the mode is unset/unknown, or when
 * 'include' is selected with an empty include list — so a half-configured
 * filter can never silently drop every user.
 */
export function resolveSyncEmployeeFilter(
  variables: Record<string, unknown>,
): ResolvedSyncEmployeeFilter {
  const rawMode = variables.sync_user_filter_mode;
  const requestedMode: SyncUserFilterMode =
    typeof rawMode === 'string' &&
    SYNC_USER_FILTER_MODES.has(rawMode as SyncUserFilterMode)
      ? (rawMode as SyncUserFilterMode)
      : 'all';

  const excludedTerms = parseSyncFilterTerms(variables.sync_excluded_emails);
  const includedTerms = parseSyncFilterTerms(variables.sync_included_emails);

  const mode: SyncUserFilterMode =
    requestedMode === 'include' && includedTerms.length === 0
      ? 'all'
      : requestedMode;

  return { mode, excludedTerms, includedTerms };
}

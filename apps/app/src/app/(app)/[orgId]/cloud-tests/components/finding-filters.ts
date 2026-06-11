/**
 * Scope a flat list of findings to a single connection (= one cloud account).
 *
 * Cloud Tests fetches findings for every connected account in one call, and
 * each provider section renders only the *selected* account's findings. The
 * scoping was previously written as
 *   `f.providerSlug === providerSlug || f.connectionId === connectionId`
 * — an OR whose first clause matches EVERY finding of the provider, so the
 * second clause never narrowed anything. With multiple AWS accounts, picking a
 * different account in the connection selector therefore did nothing: the list
 * always showed all accounts' findings merged together.
 *
 * Scoping strictly by `connectionId` is correct because every finding carries a
 * required `connectionId` (see `types.ts`) and each section is rendered with the
 * selected connection's id (see `ProviderTabs`).
 */
export function filterFindingsByConnection<T extends { connectionId: string }>(
  findings: T[],
  connectionId: string,
): T[] {
  return findings.filter((finding) => finding.connectionId === connectionId);
}

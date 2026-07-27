export type TwoFactorStatus = 'enabled' | 'missing' | 'not-provided';

/** Shape of GET /v1/integrations/sync/two-factor-statuses. */
export interface TwoFactorStatusesResponse {
  configured: boolean;
  source: string | null;
  statuses: Array<{ email: string; status: 'enabled' | 'missing' }>;
}

/**
 * Join the 2FA source's per-email results onto members by lowercased email.
 *
 * Returns an empty map when no 2FA source is configured (callers render no 2FA
 * row at all). A member with no matching result row gets 'not-provided' —
 * absence means the source had no data for them, which must never read as an
 * explicit 'missing' failure.
 */
export function buildTwoFactorStatusMap(
  members: Array<{ id: string; user: { email: string | null } }>,
  response: TwoFactorStatusesResponse | undefined,
): Record<string, TwoFactorStatus> {
  if (!response?.configured) return {};

  const byEmail = new Map(
    response.statuses.map((s) => [s.email.toLowerCase().trim(), s.status]),
  );

  const map: Record<string, TwoFactorStatus> = {};
  for (const member of members) {
    const email = member.user.email?.toLowerCase().trim();
    map[member.id] = (email && byEmail.get(email)) || 'not-provided';
  }
  return map;
}

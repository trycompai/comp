/**
 * Decides where to send a signed-in user who has **no active organization**.
 *
 * This centralizes the CS-569 offboarding-loop guard so the root landing page
 * (`app/page.tsx`) and the `/setup` entry route can't drift apart — divergent
 * per-path membership handling is exactly what caused CS-569.
 *
 * Precedence:
 *  1. A pending invitation is always the way in → `/invite/{id}`.
 *  2. Offboarded (memberships exist but are all deactivated) → `/auth/access-removed`
 *     (do NOT drop them into onboarding; that spawns a spurious org + loop).
 *  3. Genuinely new user (no memberships at all) → `null` (caller decides the
 *     onboarding target).
 *
 * Null-safe: a missing `/v1/auth/me` payload is treated as "new user" (`null`),
 * so a transient API failure degrades to onboarding rather than a dead-end.
 */
export function resolveNoActiveOrgRedirect(
  me:
    | {
        pendingInvitation?: { id: string } | null;
        hasInactiveMembership?: boolean;
      }
    | null
    | undefined,
): string | null {
  if (me?.pendingInvitation) {
    return `/invite/${me.pendingInvitation.id}`;
  }
  if (me?.hasInactiveMembership) {
    return '/auth/access-removed';
  }
  return null;
}

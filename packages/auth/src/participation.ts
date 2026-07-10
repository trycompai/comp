/**
 * Organization participation rules.
 *
 * A *platform admin* is a global Comp AI staff account (`User.role === 'admin'`)
 * that can enter any organization for support/debugging. By default such an
 * account is NOT a genuine participant of the customer orgs it enters, so it is
 * excluded from that org's business logic: it cannot be an assignee/approver, is
 * not counted toward compliance progress, and does not receive org-scoped
 * notifications.
 *
 * The single exception is an *internal* organization — one operated by the
 * platform itself (e.g. Comp AI's own org). There, the platform admins ARE the
 * real members and must be able to run compliance like any other org.
 *
 * `isOrgParticipant` is the single source of truth for that rule. Do NOT
 * reintroduce inline `user.role === 'admin'` participation checks anywhere —
 * call this instead so the internal-org exception stays consistent.
 *
 * SCOPE: this governs *participation* only. It must never be used to decide
 * platform-admin access or privileges — those stay with PlatformAdminGuard /
 * `isPlatformAdmin`, which are unaffected by an org being internal.
 */
export const PLATFORM_ADMIN_ROLE = 'admin';

export interface OrgParticipationContext {
  /** Whether the organization is platform-operated (e.g. Comp AI's own org). */
  orgIsInternal: boolean;
}

/**
 * Returns true when `userRole` should be treated as a real participant of an
 * organization with the given context.
 *
 * @param userRole The global `User.role` value (e.g. `'admin'` for platform
 *   admins, `'user'`/null otherwise). This is NOT the org-scoped member role.
 */
export function isOrgParticipant(
  userRole: string | null | undefined,
  { orgIsInternal }: OrgParticipationContext,
): boolean {
  if (orgIsInternal) return true;
  return userRole !== PLATFORM_ADMIN_ROLE;
}

/**
 * Inverse of {@link isOrgParticipant} — true when the user must be excluded from
 * the org's participation-level business logic. Convenience for the many call
 * sites whose existing shape is "if (isPlatformAdmin) exclude".
 */
export function isExcludedFromOrgParticipation(
  userRole: string | null | undefined,
  ctx: OrgParticipationContext,
): boolean {
  return !isOrgParticipant(userRole, ctx);
}

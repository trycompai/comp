/**
 * Pure, dependency-free org-participation rule.
 *
 * This is a deliberate mirror of `packages/auth/src/participation.ts`. The app
 * cannot import `@trycompai/auth` from files that end up in the Trigger.dev
 * bundle (that package pulls in better-auth, which the deploy pipeline can't
 * bundle — see policy-acknowledgment-digest-helpers.ts for the same pattern).
 * Keeping this rule free of imports lets both RSC/server code and Trigger.dev
 * tasks share one implementation. KEEP IN SYNC with the auth package version.
 *
 * Platform admins (`User.role === 'admin'`) are Comp AI staff embedded in
 * customer orgs for support; they are excluded from an org's business logic
 * UNLESS the org is internal (platform-operated, e.g. Comp AI's own org).
 */
export const PLATFORM_ADMIN_ROLE = 'admin';

export function isOrgParticipant(
  userRole: string | null | undefined,
  { orgIsInternal }: { orgIsInternal: boolean },
): boolean {
  if (orgIsInternal) return true;
  return userRole !== PLATFORM_ADMIN_ROLE;
}

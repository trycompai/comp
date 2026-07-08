import { db } from '@db/server';
import { isOrgParticipant } from './org-participation-rule';

/**
 * App-side mirror of the API's org-participation helpers. See
 * `packages/auth/src/participation.ts` for the shared rule: platform admins are
 * Comp AI staff embedded in customer orgs and are excluded from an org's
 * business logic, UNLESS the org is internal (platform-operated, e.g. Comp AI's
 * own org) where they are real members.
 */
export { isOrgParticipant };

/** Whether an org is platform-operated ("internal", e.g. Comp AI's own org). */
export async function getOrgIsInternal(organizationId: string): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { isInternal: true },
  });
  return org?.isInternal ?? false;
}

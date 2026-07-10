import 'server-only';

import { db } from '@db/server';

/**
 * App-side server helper for the org-participation rule. This module imports
 * `@db/server`, so it must only be used from server code. The pure predicate
 * lives in `./org-participation-rule` (dependency-free) — import
 * `isOrgParticipant` from there directly so client/Trigger.dev bundles never
 * pull `@db/server` in transitively. See `packages/auth/src/participation.ts`
 * for the canonical rule.
 */

/** Whether an org is platform-operated ("internal", e.g. Comp AI's own org). */
export async function getOrgIsInternal(organizationId: string): Promise<boolean> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { isInternal: true },
  });
  return org?.isInternal ?? false;
}

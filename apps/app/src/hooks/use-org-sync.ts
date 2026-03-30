'use client';

import { authClient, useActiveOrganization } from '@/utils/auth-client';
import { useEffect } from 'react';

/**
 * Syncs the client-side Better Auth active organization with the URL orgId.
 *
 * The server-side layout already updates the session's activeOrganizationId
 * in the DB when the URL orgId differs. This hook handles the client-side
 * counterpart: calling authClient.organization.setActive() so that
 * useActiveOrganization() and SWR cache keys stay in sync.
 *
 * Without this, opening an app link for a different org would leave the
 * client-side auth state pointing at the old org, causing stale data in
 * hooks like useApiSWR.
 */
export function useOrgSync({ orgId }: { orgId: string }) {
  const { data: activeOrg } = useActiveOrganization();

  useEffect(() => {
    if (!orgId || !activeOrg) {
      return;
    }

    if (activeOrg.id === orgId) {
      return;
    }

    authClient.organization
      .setActive({ organizationId: orgId })
      .catch((error: unknown) => {
        console.error('[useOrgSync] Failed to sync active organization:', error);
      });
  }, [orgId, activeOrg]);
}

'use client';

import { usePathname } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useEffect, useRef } from 'react';

interface OrganizationIdentifierProps {
  orgId: string;
  orgName?: string;
}

export function OrganizationIdentifier({ orgId, orgName }: OrganizationIdentifierProps) {
  const posthog = usePostHog();
  const pathname = usePathname();
  const isFirstPathnameRun = useRef(true);

  useEffect(() => {
    if (!posthog || !orgId) return;
    posthog.group('organization', orgId, orgName ? { name: orgName } : undefined);
  }, [posthog, orgId, orgName]);

  // Refresh flags on route changes so users pick up admin toggles during
  // normal SPA navigation. Skip the initial mount — posthog.init() already
  // fetches flags on page load.
  useEffect(() => {
    if (!posthog) return;
    if (isFirstPathnameRun.current) {
      isFirstPathnameRun.current = false;
      return;
    }
    posthog.reloadFeatureFlags();
  }, [posthog, pathname]);

  return null;
}

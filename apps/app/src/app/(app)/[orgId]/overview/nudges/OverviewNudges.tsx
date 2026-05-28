'use client';

import { useEffect, useState } from 'react';
import { useOffboardingNudge } from './OffboardingNudge';
import { useTrustPortalSetupNudge } from './TrustPortalSetupNudge';
import type { ServerNudgeData } from './types';

const dismissKey = (id: string, orgId: string) =>
  `overview-nudge-dismissed:${id}:${orgId}`;

export function OverviewNudges({
  orgId,
  server,
}: {
  orgId: string;
  server: ServerNudgeData;
}) {
  // Hooks called unconditionally, in stable priority order.
  const offboarding = useOffboardingNudge();
  const trust = useTrustPortalSetupNudge({ orgId, server });
  const candidates = [offboarding, trust];

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const next = new Set<string>();
    for (const c of candidates) {
      if (
        c.persistDismissal &&
        window.localStorage.getItem(dismissKey(c.id, orgId)) === '1'
      ) {
        next.add(c.id);
      }
    }
    setDismissed(next);
    // candidates is rebuilt each render with stable ids; seed once per org.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (!mounted) return null;

  const visible = candidates
    .filter((c) => c.ready && c.eligible && !dismissed.has(c.id))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!visible) return null;

  const handleDismiss = () => {
    if (visible.persistDismissal && typeof window !== 'undefined') {
      window.localStorage.setItem(dismissKey(visible.id, orgId), '1');
    }
    setDismissed((prev) => new Set(prev).add(visible.id));
  };

  return <>{visible.render(handleDismiss)}</>;
}

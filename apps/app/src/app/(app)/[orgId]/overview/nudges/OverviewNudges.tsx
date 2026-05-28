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

  // Stable across renders unless a persistable nudge is added/removed.
  const persistableIds = candidates
    .filter((c) => c.persistDismissal)
    .map((c) => c.id)
    .join(',');

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const next = new Set<string>();
    for (const id of persistableIds.split(',').filter(Boolean)) {
      if (window.localStorage.getItem(dismissKey(id, orgId)) === '1') {
        next.add(id);
      }
    }
    setDismissed(next);
  }, [orgId, persistableIds]);

  if (!mounted) return null;

  const visible = candidates
    .filter((c) => c.ready && c.eligible && !dismissed.has(c.id))
    .sort((a, b) => a.priority - b.priority)[0];

  if (!visible) return null;

  const handleDismiss = () => {
    if (visible.persistDismissal) {
      window.localStorage.setItem(dismissKey(visible.id, orgId), '1');
    }
    setDismissed((prev) => new Set(prev).add(visible.id));
  };

  return <>{visible.render(handleDismiss)}</>;
}

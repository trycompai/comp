'use client';

import { useEffect, useState } from 'react';
import { NudgeCenter } from './NudgeCenter';
import { useOffboardingNudge } from './OffboardingNudge';
import { useTrustPortalSetupNudge } from './TrustPortalSetupNudge';
import type { NudgeState, ServerNudgeData } from './types';

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
  const [expanded, setExpanded] = useState(false);
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
    .sort((a, b) => a.priority - b.priority);

  if (visible.length === 0) return null;

  const dismiss = (nudge: NudgeState) => () => {
    if (nudge.persistDismissal) {
      window.localStorage.setItem(dismissKey(nudge.id, orgId), '1');
    }
    setDismissed((prev) => new Set(prev).add(nudge.id));
  };

  // Single nudge: render it plainly, no tray chrome.
  if (visible.length === 1) {
    return <>{visible[0].render(dismiss(visible[0]))}</>;
  }

  // Only honor `expanded` while there's actually more than one to show, so a
  // dismissal that drops the count to 1 (then a new one later) can't surprise-
  // expand the tray.
  const isExpanded = expanded && visible.length > 1;
  const shown = isExpanded ? visible : visible.slice(0, 1);

  return (
    <NudgeCenter
      count={visible.length}
      expanded={isExpanded}
      onToggle={() => setExpanded((prev) => !prev)}
    >
      {shown.map((nudge) => (
        <div key={nudge.id}>{nudge.render(dismiss(nudge))}</div>
      ))}
    </NudgeCenter>
  );
}

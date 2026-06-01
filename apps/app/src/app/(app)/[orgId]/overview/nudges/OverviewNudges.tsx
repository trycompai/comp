'use client';

import { useEffect, useState } from 'react';
import { useFrameworkUpdatesNudge } from './FrameworkUpdatesNudge';
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
  const frameworkUpdates = useFrameworkUpdatesNudge();
  const trust = useTrustPortalSetupNudge({ orgId, server });
  const candidates = [offboarding, frameworkUpdates, trust];

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

  const visible = candidates
    .filter((c) => c.ready && c.eligible && !dismissed.has(c.id))
    .sort((a, b) => a.priority - b.priority);

  // Collapse the tray whenever there's no longer more than one to fan out.
  useEffect(() => {
    if (visible.length <= 1 && expanded) setExpanded(false);
  }, [visible.length, expanded]);

  if (!mounted || visible.length === 0) return null;

  const dismiss = (nudge: NudgeState) => () => {
    if (nudge.persistDismissal) {
      window.localStorage.setItem(dismissKey(nudge.id, orgId), '1');
    }
    setDismissed((prev) => new Set(prev).add(nudge.id));
  };

  const body =
    visible.length === 1 ? (
      visible[0].render(dismiss(visible[0]))
    ) : (
      <NudgeCenter
        count={visible.length}
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
      >
        {(expanded ? visible : visible.slice(0, 1)).map((nudge) => (
          <div key={nudge.id}>{nudge.render(dismiss(nudge))}</div>
        ))}
      </NudgeCenter>
    );

  // Match the page's centered content width so nudges align with everything else.
  return <div className="mx-auto w-full max-w-[1200px] pb-6">{body}</div>;
}

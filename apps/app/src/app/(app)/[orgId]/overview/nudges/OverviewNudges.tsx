'use client';

import { ChevronDown, ChevronUp } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
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

  // Single nudge: render it plainly, no stack chrome.
  if (visible.length === 1) {
    return <>{visible[0].render(dismiss(visible[0]))}</>;
  }

  // Expanded: every waiting nudge, with a control to collapse back.
  if (expanded) {
    return (
      <div className="flex flex-col gap-3">
        {visible.map((nudge) => (
          <div key={nudge.id}>{nudge.render(dismiss(nudge))}</div>
        ))}
        <StackToggle
          expanded
          count={visible.length}
          onClick={() => setExpanded(false)}
        />
      </div>
    );
  }

  // Collapsed: the top nudge over a faux "stack" edge, plus an expand control.
  const top = visible[0];
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-2 -z-10 h-full rounded-lg border border-border bg-card"
        />
        {top.render(dismiss(top))}
      </div>
      <StackToggle
        expanded={false}
        count={visible.length}
        onClick={() => setExpanded(true)}
      />
    </div>
  );
}

function StackToggle({
  expanded,
  count,
  onClick,
}: {
  expanded: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 self-start rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {expanded ? (
        <>
          Show less
          <ChevronUp size={14} />
        </>
      ) : (
        <>
          Show {count} notifications
          <ChevronDown size={14} />
        </>
      )}
    </button>
  );
}

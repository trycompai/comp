'use client';

import { Button } from '@trycompai/design-system';

interface ConnectionsErrorStateProps {
  onRetry: () => void;
}

/**
 * Shown when the org's vendor connections couldn't be loaded. Rendered instead
 * of the onboarding/list states so a fetch failure never masquerades as
 * "no connections yet" (which would invite reconnecting an already-connected
 * vendor or hide existing automations' status).
 */
export function ConnectionsErrorState({ onRetry }: ConnectionsErrorStateProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="text-sm text-foreground">Couldn&apos;t load your vendor connections</div>
        <p className="max-w-[360px] text-xs leading-relaxed text-muted-foreground">
          Your connections and automations are safe — this is just a loading
          hiccup. Retry, or refresh the page if it keeps happening.
        </p>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

'use client';

import { formatMonthDayUtc, nextRunAfter } from '@/components/schedule-utils';
import type { TaskFrequency } from '@db';
import { formatDistanceToNow } from 'date-fns';
import type { BrowserAutomationRun } from '../../hooks/types';

/** Lowercase cadence words used inline in the meta grammar ("… · daily · …"). */
const CADENCE_WORD: Record<TaskFrequency, string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
  yearly: 'yearly',
};

interface AutomationMetaLineProps {
  scheduleFrequency?: TaskFrequency;
  lastRunAt?: string | null;
  latestRun?: BrowserAutomationRun;
  isPaused: boolean;
  /** Render as a compact single clause that sits inline beside the name (2B). */
  inline?: boolean;
}

/**
 * One muted line, one fact per clause, no restating (designer's "Run Button and
 * Meta Line" option A grammar):
 *   • paused    → "Paused · monthly schedule on hold"
 *   • failed    → red "Last run failed …" · weekly · next Jul 28
 *   • never run → "First run today · then daily" (no date — the first run lands
 *                 on the next tick for any cadence, so a date would be noise)
 *   • ran ok    → "Last ran … · daily · next Jul 24"
 */
export function AutomationMetaLine({
  scheduleFrequency,
  lastRunAt,
  latestRun,
  isPaused,
  inline,
}: AutomationMetaLineProps) {
  const cadence = scheduleFrequency ? CADENCE_WORD[scheduleFrequency] : null;
  // Next run is only meaningful once there's a real last-run timestamp; it is
  // derived from lastRunAt (not "now"), so server and client agree.
  const nextRun =
    scheduleFrequency && lastRunAt
      ? formatMonthDayUtc(nextRunAfter(scheduleFrequency, new Date(lastRunAt)))
      : null;
  const cadenceThenNext = `${cadence ? ` · ${cadence}` : ''}${nextRun ? ` · next ${nextRun}` : ''}`;

  // Inline (2B): a compact, non-wrapping clause that rides next to the name.
  // Block (default): its own line under the name, free to wrap.
  const base = inline
    ? 'flex flex-none items-center gap-x-1.5 whitespace-nowrap text-[10.5px] text-muted-foreground'
    : 'mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground';

  if (isPaused) {
    return (
      <div className={base}>
        <span>Paused{cadence ? ` · ${cadence} schedule on hold` : ''}</span>
      </div>
    );
  }

  if (latestRun?.status === 'failed') {
    const when = formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true });
    return (
      <div className={base}>
        <span className="text-destructive">Last run failed {when}</span>
        {cadenceThenNext && <span>{cadenceThenNext.replace(/^ · /, '· ')}</span>}
      </div>
    );
  }

  if (!latestRun || !lastRunAt) {
    return (
      <div className={base}>
        <span>First run today{cadence ? ` · then ${cadence}` : ''}</span>
      </div>
    );
  }

  const when = formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true });
  return (
    <div className={base}>
      <span>
        Last ran {when}
        {cadenceThenNext}
      </span>
    </div>
  );
}

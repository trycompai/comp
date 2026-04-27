'use client';

import { cn } from '@trycompai/design-system/cn';

interface AgentProgressGridProps {
  /** Total agents running in this pentest (from Maced's progress). */
  total: number;
  /** How many have finished. */
  done: number;
  className?: string;
}

/**
 * 22-cell (or whatever `total` is) horizontal grid showing agent progress.
 * Completed cells are filled with `--primary`. The single currently-running
 * cell pulses. Pending cells are muted. Matches the "hero" band from the
 * design handoff.
 */
export function AgentProgressGrid({
  total,
  done,
  className,
}: AgentProgressGridProps) {
  const count = Math.max(total, 1);
  const running = done < count ? 1 : 0;
  const pending = Math.max(count - done - running, 0);

  return (
    <div
      className={cn(
        'grid h-2 gap-[2px] rounded-[var(--radius-sm)] overflow-hidden',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      aria-label={`Agents: ${done} of ${count} complete`}
    >
      {Array.from({ length: done }).map((_, i) => (
        <span key={`done-${i}`} className="bg-primary" />
      ))}
      {running > 0 ? (
        <span key="running" className="pt-agent-cell--running" />
      ) : null}
      {Array.from({ length: pending }).map((_, i) => (
        <span key={`pending-${i}`} className="bg-muted" />
      ))}
    </div>
  );
}

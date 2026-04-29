import { cn } from '@trycompai/design-system/cn';

type StatusKind =
  | 'provisioning'
  | 'cloning'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface StatusPillProps {
  status: StatusKind | string;
  /**
   * @deprecated retained for prop compatibility. Was used to promote
   * `completed` runs to a "clean" pill, but the sidebar list can't compute
   * the same value (no per-run issue counts in the list endpoint), which
   * led to the detail view saying "CLEAN" while the sidebar said
   * "COMPLETED" for the same run. The promotion is dropped — the hero
   * headline ("No findings reported in this scan") already carries the
   * success cue.
   */
  findingCount?: number;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusKind,
  { label: string; dotClass: string; textClass: string }
> = {
  provisioning: {
    label: 'Provisioning',
    dotClass: 'bg-muted-foreground animate-pulse',
    textClass: 'text-muted-foreground',
  },
  cloning: {
    label: 'Cloning',
    dotClass: 'bg-muted-foreground animate-pulse',
    textClass: 'text-muted-foreground',
  },
  running: {
    label: 'Running',
    dotClass: 'bg-[var(--pt-pulse)] animate-pulse',
    textClass: 'text-foreground',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-primary',
    textClass: 'text-foreground',
  },
  failed: {
    label: 'Failed',
    dotClass: 'bg-destructive',
    textClass: 'text-destructive',
  },
  cancelled: {
    label: 'Cancelled',
    dotClass: 'bg-muted-foreground',
    textClass: 'text-muted-foreground',
  },
};

// Fallback for status values we don't know how to render. Better to
// show "Unknown" than to silently render an unrelated status (e.g.
// previously this defaulted to "Provisioning", which would mislead
// users into thinking the scan was still starting up).
const CONFIG_UNKNOWN: { label: string; dotClass: string; textClass: string } = {
  label: 'Unknown',
  dotClass: 'bg-muted-foreground',
  textClass: 'text-muted-foreground',
};

export function StatusPill({ status, className }: StatusPillProps) {
  const config = STATUS_CONFIG[status as StatusKind] ?? CONFIG_UNKNOWN;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5',
        'text-[10px] font-bold uppercase tracking-[0.08em]',
        config.textClass,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  );
}

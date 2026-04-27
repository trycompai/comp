import { cn } from '@trycompai/design-system/cn';

type StatusKind =
  | 'provisioning'
  | 'cloning'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'clean';

interface StatusPillProps {
  status: StatusKind | string;
  /** Total + found count — used to distinguish "completed" from "clean". */
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
  clean: {
    label: 'Clean',
    dotClass: 'bg-[var(--pt-sev-low-bar)]',
    textClass: 'text-[var(--pt-sev-low-fg)]',
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

const CONFIG_DEFAULT = STATUS_CONFIG.provisioning;

export function StatusPill({ status, findingCount, className }: StatusPillProps) {
  // Promote completed runs with zero findings to the "clean" look.
  const effective: StatusKind =
    status === 'completed' && findingCount === 0
      ? 'clean'
      : (status as StatusKind);
  const config = STATUS_CONFIG[effective] ?? CONFIG_DEFAULT;

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

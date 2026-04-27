import { cn } from '@trycompai/design-system/cn';
import type { IssueSeverity } from '@/lib/security/penetration-tests-client';
import {
  SEVERITY_BG_VAR,
  SEVERITY_FG_VAR,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
} from './severity';

interface SevTallyProps {
  /** Counts keyed by severity. Missing severities render as 0. */
  counts: Partial<Record<IssueSeverity, number>>;
  /** Size variant. `hero` is the big post-scan tally, `mid` is overview. */
  size?: 'hero' | 'mid' | 'sm';
  className?: string;
}

export function SevTally({ counts, size = 'mid', className }: SevTallyProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-5 overflow-hidden rounded-[var(--radius)] border border-border',
        className,
      )}
    >
      {SEVERITY_ORDER.map((sev) => {
        const n = counts[sev] ?? 0;
        const active = n > 0;
        return (
          <div
            key={sev}
            className={cn(
              'flex flex-col items-center justify-center border-r border-border last:border-r-0',
              'transition-colors duration-300',
              size === 'hero' && 'gap-1 px-4 py-5',
              size === 'mid' && 'gap-1 px-3 py-3',
              size === 'sm' && 'gap-0.5 px-2 py-2',
            )}
            style={
              active
                ? { backgroundColor: SEVERITY_BG_VAR[sev] }
                : undefined
            }
          >
            <span
              className={cn(
                'font-light leading-none tabular-nums',
                size === 'hero' && 'text-[40px] tracking-[-0.03em]',
                size === 'mid' && 'text-[28px] tracking-[-0.02em]',
                size === 'sm' && 'text-[22px] tracking-[-0.02em]',
              )}
              style={{
                color: active ? SEVERITY_FG_VAR[sev] : undefined,
              }}
            >
              {n}
            </span>
            <span
              className={cn(
                'font-bold uppercase tracking-[0.08em]',
                size === 'hero' ? 'text-[11px]' : 'text-[10px]',
              )}
              style={{
                color: active ? SEVERITY_FG_VAR[sev] : 'var(--muted-foreground)',
              }}
            >
              {SEVERITY_LABEL[sev]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

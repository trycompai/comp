import { cn } from '@trycompai/design-system/cn';
import type { IssueSeverity } from '@/lib/security/penetration-tests-client';
import {
  SEVERITY_BG_VAR,
  SEVERITY_FG_VAR,
  SEVERITY_LABEL,
} from './severity';

interface SevChipProps {
  severity: IssueSeverity;
  size?: 'sm' | 'md';
  className?: string;
}

export function SevChip({ severity, size = 'md', className }: SevChipProps) {
  const sm = size === 'sm';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold uppercase tracking-[0.08em]',
        sm ? 'h-4 px-1.5 text-[9px]' : 'h-5 px-2 text-[10px]',
        className,
      )}
      style={{
        backgroundColor: SEVERITY_BG_VAR[severity],
        color: SEVERITY_FG_VAR[severity],
      }}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

import { cn } from '@/lib/utils';
import {
  LEVEL_COLOR,
  getRiskLevelFromScore,
  getRiskScore,
  type RiskLevel,
} from '@/lib/risk-score';
import type { Impact, Likelihood } from '@db';

const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very-high': 'Very high',
};

export interface RiskScoreBadgeProps {
  /**
   * Provide a precomputed 1-10 score directly, or pass `likelihood` + `impact`
   * to have the badge derive it via `getRiskScore`. The score-derived path is
   * what callers use when they want a current/interpolated value (e.g. Risks
   * table SEVERITY column factoring in task completion).
   */
  score?: number;
  likelihood?: Likelihood;
  impact?: Impact;
  className?: string;
}

export function RiskScoreBadge({
  score,
  likelihood,
  impact,
  className,
}: RiskScoreBadgeProps) {
  const resolvedScore =
    score ?? (likelihood && impact ? getRiskScore(likelihood, impact).score : 1);
  const level = getRiskLevelFromScore(resolvedScore);
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums',
        className,
      )}
      style={
        {
          '--band': LEVEL_COLOR[level],
          backgroundColor: 'color-mix(in oklab, var(--band) 15%, transparent)',
          borderColor: 'color-mix(in oklab, var(--band) 40%, transparent)',
          color: 'var(--band)',
        } as React.CSSProperties
      }
      title={`${LEVEL_LABEL[level]} risk`}
    >
      {resolvedScore}/10
    </span>
  );
}

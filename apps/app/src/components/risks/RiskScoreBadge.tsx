import { cn } from '@/lib/utils';
import type { Impact, Likelihood } from '@db';
import { getRiskScore, type RiskLevel } from '@/lib/risk-score';

const LEVEL_CLASSES: Record<RiskLevel, string> = {
  'very-low':
    'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  low: 'bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300',
  medium: 'bg-yellow-500/15 border-yellow-600/40 text-yellow-700 dark:text-yellow-300',
  high: 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300',
  'very-high': 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300',
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very-high': 'Very high',
};

export interface RiskScoreBadgeProps {
  likelihood: Likelihood;
  impact: Impact;
  className?: string;
}

export function RiskScoreBadge({ likelihood, impact, className }: RiskScoreBadgeProps) {
  const { score, level } = getRiskScore(likelihood, impact);
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums',
        LEVEL_CLASSES[level],
        className,
      )}
      title={`${LEVEL_LABEL[level]} risk`}
    >
      {score}/10
    </span>
  );
}

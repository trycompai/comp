import { Impact, Likelihood } from '@db';

// Server-side mirror of apps/app/src/lib/risk-score.ts (scores, level bands,
// labels). Keep the logic in the two files LITERALLY identical — a divergence
// lets the UI and the exported Risk Treatment Plan disagree about a risk's
// level. Only the UI-only exports (LEVEL_COLOR CSS tokens,
// getRiskLevelFromScore) are omitted here.

export const LIKELIHOOD_SCORES: Record<Likelihood, number> = {
  very_unlikely: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  very_likely: 5,
};

export const IMPACT_SCORES: Record<Impact, number> = {
  insignificant: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  severe: 5,
};

export type RiskLevel = 'very-low' | 'low' | 'medium' | 'high' | 'very-high';

export interface RiskScore {
  raw: number;
  score: number;
  level: RiskLevel;
}

export function getRiskLevel(raw: number): RiskLevel {
  if (raw > 16) return 'very-high';
  if (raw > 9) return 'high';
  if (raw > 4) return 'medium';
  if (raw > 1) return 'low';
  return 'very-low';
}

/** Human-readable level labels for exported documents and API responses. */
export const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very-high': 'Very high',
};

export function getRiskScore(
  likelihood: Likelihood,
  impact: Impact,
): RiskScore {
  const raw = LIKELIHOOD_SCORES[likelihood] * IMPACT_SCORES[impact];
  const score = Math.max(1, Math.ceil(raw / 2.5));
  return { raw, score, level: getRiskLevel(raw) };
}

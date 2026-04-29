import { Impact, Likelihood } from '@db';

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

export function getRiskScore(likelihood: Likelihood, impact: Impact): RiskScore {
  const raw = LIKELIHOOD_SCORES[likelihood] * IMPACT_SCORES[impact];
  const score = Math.max(1, Math.ceil(raw / 2.5));
  return { raw, score, level: getRiskLevel(raw) };
}

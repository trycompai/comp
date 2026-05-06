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

/**
 * Like `getRiskLevel`, but indexed off the normalized 1-10 score so callers
 * that show the score (Treatment Plan hero, RiskScale) and the level label
 * stay consistent. Buckets mirror RiskScale's 5 visual segments (2 score
 * units each):
 *
 *   1-2 → very-low,  3-4 → low,  5-6 → medium,  7-8 → high,  9-10 → very-high
 */
export function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 9) return 'very-high';
  if (score >= 7) return 'high';
  if (score >= 5) return 'medium';
  if (score >= 3) return 'low';
  return 'very-low';
}

/**
 * Solid (full-opacity) color tokens for each risk level. Built from the
 * `--success` / `--warning` / `--destructive` design tokens that drive the
 * RiskScale bar segments, so any UI surface that shows a level (numeral,
 * badge, tick, narrative tag, matrix cell) reads as the same color family.
 */
export const LEVEL_COLOR: Record<RiskLevel, string> = {
  'very-low': 'var(--success)',
  low: 'color-mix(in oklab, var(--success) 50%, var(--warning))',
  medium: 'var(--warning)',
  high: 'color-mix(in oklab, var(--warning) 50%, var(--destructive))',
  'very-high': 'var(--destructive)',
};

/** Human-readable level labels for risk badges and table cells. */
export const LEVEL_LABEL: Record<RiskLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  'very-high': 'Very high',
};

export function getRiskScore(likelihood: Likelihood, impact: Impact): RiskScore {
  const raw = LIKELIHOOD_SCORES[likelihood] * IMPACT_SCORES[impact];
  const score = Math.max(1, Math.ceil(raw / 2.5));
  return { raw, score, level: getRiskLevel(raw) };
}

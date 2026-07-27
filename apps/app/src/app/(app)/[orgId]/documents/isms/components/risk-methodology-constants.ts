// Fixed labels for the Risk Assessment Methodology document (6.1.2). Client
// mirror of apps/api/src/isms/documents/risk-methodology-defaults.ts — keep
// the two files LITERALLY identical so the editor rows line up with the
// exported document.

/** Platform likelihood levels, in ascending order (matches the Likelihood enum). */
export const METHODOLOGY_LIKELIHOOD_LABELS = [
  '1 - Very unlikely',
  '2 - Unlikely',
  '3 - Possible',
  '4 - Likely',
  '5 - Very likely',
] as const;

/** Platform impact levels, in ascending order (matches the Impact enum). */
export const METHODOLOGY_IMPACT_LABELS = [
  '1 - Insignificant',
  '2 - Minor',
  '3 - Moderate',
  '4 - Major',
  '5 - Severe',
] as const;

/** Platform risk-level bands, in ascending order (matches risk-score.ts). */
export const METHODOLOGY_LEVEL_LABELS = [
  'Very low',
  'Low',
  'Medium',
  'High',
  'Very high',
] as const;

/**
 * Platform treatment strategies in the reference document's display order,
 * with the equivalent ISO 27001 treatment option named alongside.
 */
export const METHODOLOGY_TREATMENT_LABELS = [
  'Mitigate (ISO 27001: Modify)',
  'Avoid (ISO 27001: Avoid)',
  'Transfer (ISO 27001: Share)',
  'Accept (ISO 27001: Retain)',
] as const;

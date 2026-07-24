// Seeded default text for the Risk Assessment Methodology document (6.1.2).
// Adapted from the CS-727 reference document, aligned to the platform's REAL
// behavior: the five-band risk level scale (very-low .. very-high, computed as
// likelihood x impact in apps/api/src/risks/risk-level.ts) and the platform's
// four treatment strategies (mitigate/avoid/transfer/accept) with their ISO
// 27001 option names (Modify/Avoid/Share/Retain). Keep text ASCII-safe: the
// PDF renderer's standard fonts cannot render glyphs like ">=" ligatures.

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

/** Platform risk-level bands, in ascending order (matches risk-level.ts). */
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

export const DEFAULT_LIKELIHOOD_DESCRIPTIONS: string[] = [
  'Very unlikely to occur; may occur only in exceptional circumstances (e.g. once every 5+ years).',
  'Not expected to occur but possible (e.g. once every 2-5 years).',
  'Could occur under normal circumstances (e.g. once per year).',
  'Will probably occur in most circumstances (e.g. multiple times per year).',
  'Expected to occur in most circumstances (e.g. monthly or more often).',
];

export const DEFAULT_IMPACT_DESCRIPTIONS: string[] = [
  'Negligible operational, financial, legal, or reputational impact. Resolvable within hours.',
  'Limited impact on a single function; short-term inconvenience; no external notification required.',
  'Noticeable disruption to one or more functions; possible customer impact; short-term reputational effect.',
  'Significant disruption to the service; customer-visible impact; regulator notification may be triggered; measurable financial loss.',
  'Existential impact on the organisation; extended service outage; multi-jurisdiction regulator engagement; significant financial or reputational loss.',
];

/** Acceptance requirement per risk-level band (very-low .. very-high). */
export const DEFAULT_ACCEPTANCE_THRESHOLDS: string[] = [
  'Accepted by default. Recorded in the register; no formal owner acceptance event required.',
  'Accepted by default. Recorded in the register; a risk-owner acceptance event is recommended.',
  'Accepted with risk-owner sign-off. An owner acceptance event is recorded in Comp AI.',
  'Must be treated. If retained on business grounds, requires top-management approval and a documented acceptance event.',
  'Must be treated. Retention only in exceptional circumstances with top-management approval; escalated to the next Management Review.',
];

/** Description per treatment strategy (order matches METHODOLOGY_TREATMENT_LABELS). */
export const DEFAULT_TREATMENT_OPTIONS: string[] = [
  'Implement or strengthen controls to reduce the likelihood or impact of the risk.',
  'Discontinue or redesign the activity giving rise to the risk.',
  'Transfer or share the risk, for example via insurance or a supplier contract clause.',
  'Accept the risk at its current level. Requires acceptance per the thresholds above.',
];

export function defaultMethodologyPurpose(organizationName: string): string {
  return `This document describes the methodology by which ${organizationName} identifies, analyses, evaluates, and treats information-security risks, in accordance with ISO/IEC 27001:2022, Clause 6.1.2. It is the reference document for the Risk Register held in Comp AI and for the Risk Treatment Plan (Clause 6.1.3).`;
}

export function defaultMethodologyScope(): string {
  return "This methodology applies to all information-security risks within the ISMS scope, including risks arising from the organisation's own operations, its people, its information assets, and its third-party suppliers and sub-processors. It covers organisational risks recorded in the Risk Register and supplier risks recorded in the Vendors module.";
}

export function defaultMethodologyApproach(organizationName: string): string {
  return `${organizationName} uses an asset-based risk assessment approach. Risks are identified against the information assets, systems, and processes within the ISMS scope. For each asset or process, threats and vulnerabilities are considered and translated into risk statements; supplier risks are assessed separately against each vendor. Every risk is assessed for its inherent level (before treatment) and its residual level (after treatment), and both are recorded in Comp AI.`;
}

export function defaultMethodologyResponsibilities(): string {
  return 'Every risk in the register has a named risk owner. Risk owners are responsible for: (a) understanding the risk and the treatment applied; (b) approving the treatment plan; (c) formally accepting the residual risk via the acceptance event recorded in Comp AI; and (d) escalating to the Security & Privacy Owner or top management if the risk changes materially.';
}

export function defaultMethodologyFrequency(): string {
  return 'Risks are reviewed at least quarterly by the Security & Privacy Owner for changes in likelihood, impact, or treatment status; formally annually at the Management Review (Clause 9.3), where trends and outstanding acceptances are considered; and ad hoc on any material change to the ISMS scope, the vendor register, or the regulatory environment, or after a security incident.';
}

export function defaultMethodologyDocumentation(): string {
  return 'All risks, their treatments, and their acceptance events are held in Comp AI. Two rendered documents derive from that data: this Risk Assessment Methodology (Clause 6.1.2) and the Risk Treatment Plan (Clause 6.1.3), which is rendered from the Risk Register and Vendor Risks and shows the current treatment and residual state for every risk in scope. Acceptance events are timestamped and immutable; superseded acceptances are retained, so the risk position at any prior point in time can be evidenced.';
}

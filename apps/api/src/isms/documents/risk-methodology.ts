import { z } from 'zod';
import {
  getRiskLevel,
  LEVEL_LABEL,
  type RiskLevel,
} from '../../risks/risk-level';
import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput, IsmsPlatformData } from './types';
import {
  DEFAULT_ACCEPTANCE_THRESHOLDS,
  DEFAULT_IMPACT_DESCRIPTIONS,
  DEFAULT_LIKELIHOOD_DESCRIPTIONS,
  DEFAULT_TREATMENT_OPTIONS,
  defaultMethodologyApproach,
  defaultMethodologyDocumentation,
  defaultMethodologyFrequency,
  defaultMethodologyPurpose,
  defaultMethodologyResponsibilities,
  defaultMethodologyScope,
  METHODOLOGY_IMPACT_LABELS,
  METHODOLOGY_LEVEL_LABELS,
  METHODOLOGY_LIKELIHOOD_LABELS,
  METHODOLOGY_TREATMENT_LABELS,
} from './risk-methodology-defaults';

/**
 * Narrative shape persisted in IsmsDocument.draftNarrative for
 * risk_assessment_methodology (6.1.2). Every field is customer-editable
 * seeded text. The level/option LABELS and the 5x5 risk matrix are NOT part
 * of the narrative: they describe how the platform actually computes risk
 * levels (risk-level.ts), so they render from fixed constants — an editable
 * copy could contradict the product's real behavior.
 */
export const riskMethodologyNarrativeSchema = z.object({
  purpose: z.string(),
  scope: z.string(),
  approach: z.string(),
  /** One description per likelihood level, ascending (very_unlikely .. very_likely). */
  likelihoodDescriptions: z.array(z.string()).length(5),
  /** One description per impact level, ascending (insignificant .. severe). */
  impactDescriptions: z.array(z.string()).length(5),
  /** One acceptance requirement per risk-level band, ascending (very-low .. very-high). */
  acceptanceThresholds: z.array(z.string()).length(5),
  /** One description per treatment option (mitigate, avoid, transfer, accept). */
  treatmentOptions: z.array(z.string()).length(4),
  responsibilities: z.string(),
  frequency: z.string(),
  documentation: z.string(),
});

export type RiskMethodologyNarrative = z.infer<
  typeof riskMethodologyNarrativeSchema
>;

/** Derive the default methodology narrative (all templated, org-name aware). */
export function deriveRiskMethodologyNarrative(
  data: IsmsPlatformData,
): RiskMethodologyNarrative {
  return defaultRiskMethodologyNarrative(data.organizationName);
}

export function defaultRiskMethodologyNarrative(
  organizationName: string,
): RiskMethodologyNarrative {
  return {
    purpose: defaultMethodologyPurpose(organizationName),
    scope: defaultMethodologyScope(),
    approach: defaultMethodologyApproach(organizationName),
    likelihoodDescriptions: [...DEFAULT_LIKELIHOOD_DESCRIPTIONS],
    impactDescriptions: [...DEFAULT_IMPACT_DESCRIPTIONS],
    acceptanceThresholds: [...DEFAULT_ACCEPTANCE_THRESHOLDS],
    treatmentOptions: [...DEFAULT_TREATMENT_OPTIONS],
    responsibilities: defaultMethodologyResponsibilities(),
    frequency: defaultMethodologyFrequency(),
    documentation: defaultMethodologyDocumentation(),
  };
}

/** Soft fill per risk level for the matrix cells (hex, no '#'; black text stays legible). */
export const LEVEL_FILL_HEX: Record<RiskLevel, string> = {
  'very-low': 'DCFCE7',
  low: 'ECFCCB',
  medium: 'FEF9C3',
  high: 'FFEDD5',
  'very-high': 'FEE2E2',
};

/**
 * The 5x5 risk level matrix, computed from the SAME banding the platform uses
 * (risk-level.ts getRiskLevel over likelihood x impact). Rows run likelihood
 * 5 -> 1 (reference-document orientation); the first column is the row label.
 */
function riskMatrixTable(): NonNullable<IsmsExportSection['table']> {
  const headers = [
    '',
    ...METHODOLOGY_IMPACT_LABELS.map((_, index) => `Impact ${index + 1}`),
  ];
  const rows: string[][] = [];
  const cellFills: (string | null)[][] = [];
  for (let likelihood = 5; likelihood >= 1; likelihood -= 1) {
    const row: string[] = [`Likelihood ${likelihood}`];
    const fills: (string | null)[] = [null];
    for (let impact = 1; impact <= 5; impact += 1) {
      const level = getRiskLevel(likelihood * impact);
      row.push(LEVEL_LABEL[level]);
      fills.push(LEVEL_FILL_HEX[level]);
    }
    rows.push(row);
    cellFills.push(fills);
  }
  return { headers, rows, cellFills };
}

/** Pair fixed level/option labels with the narrative's editable descriptions. */
function labelledRows(
  labels: readonly string[],
  descriptions: string[],
): string[][] {
  return labels.map((label, index) => [label, descriptions[index] ?? '']);
}

export function buildRiskMethodologySections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const parsed = riskMethodologyNarrativeSchema.safeParse(input.narrative);
  if (!parsed.success) {
    return [
      {
        heading: 'Risk Assessment Methodology',
        emptyText: 'No methodology content saved.',
      },
    ];
  }
  const narrative = parsed.data;

  return [
    { heading: 'Purpose', paragraphs: [{ text: narrative.purpose }] },
    { heading: 'Scope', paragraphs: [{ text: narrative.scope }] },
    {
      heading: 'Risk assessment approach',
      paragraphs: [{ text: narrative.approach }],
    },
    {
      heading: 'Likelihood scale',
      intro: 'Each risk is assessed on a five-point likelihood scale:',
      table: {
        headers: ['Level', 'Description'],
        rows: labelledRows(
          METHODOLOGY_LIKELIHOOD_LABELS,
          narrative.likelihoodDescriptions,
        ),
      },
    },
    {
      heading: 'Impact scale',
      intro: 'Each risk is assessed on a five-point impact scale:',
      table: {
        headers: ['Level', 'Description'],
        rows: labelledRows(
          METHODOLOGY_IMPACT_LABELS,
          narrative.impactDescriptions,
        ),
      },
    },
    {
      heading: 'Risk level matrix',
      intro:
        'The risk level is derived from the product of likelihood and impact (1-25), mapped to five bands: Very low (1), Low (2-4), Medium (5-9), High (10-16), and Very high (17-25). Each risk in the register carries its calculated level for both its inherent and residual states.',
      table: riskMatrixTable(),
    },
    {
      heading: 'Acceptance thresholds',
      intro: 'Risk levels trigger different acceptance requirements:',
      table: {
        headers: ['Risk level', 'Acceptance requirement'],
        rows: labelledRows(
          METHODOLOGY_LEVEL_LABELS,
          narrative.acceptanceThresholds,
        ),
      },
    },
    {
      heading: 'Treatment options',
      intro: 'For each risk, one of four treatment options is selected:',
      paragraphs: METHODOLOGY_TREATMENT_LABELS.map((label, index) => ({
        label: `${label} - `,
        text: narrative.treatmentOptions[index] ?? '',
      })),
    },
    {
      heading: 'Risk-owner responsibilities',
      paragraphs: [{ text: narrative.responsibilities }],
    },
    {
      heading: 'Frequency of assessment',
      paragraphs: [{ text: narrative.frequency }],
    },
    {
      heading: 'Documentation approach',
      paragraphs: [{ text: narrative.documentation }],
    },
    {
      heading: 'Sign-off',
      paragraphs: [
        {
          text: 'This methodology is prepared by the Security & Privacy Owner and approved by top management; the approver and approval date are recorded in the document control table above. It is reviewed at least annually and when the risk landscape or the assessment approach materially changes.',
        },
      ],
    },
  ];
}

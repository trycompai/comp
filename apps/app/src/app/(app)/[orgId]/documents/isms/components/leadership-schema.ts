import { z } from 'zod';

/**
 * Zod schema + ISO 27001 clause 5.1 (a)-(h) metadata for the Leadership and
 * Commitment narrative. The narrative is a `{ statement, commitments[] }` object
 * persisted via `hook.saveNarrative`.
 */
export const leadershipCommitmentSchema = z.object({
  key: z.string().min(1),
  text: z.string(),
});

export const leadershipNarrativeSchema = z.object({
  statement: z.string().min(1, 'A commitment statement is required'),
  commitments: z.array(leadershipCommitmentSchema),
});

export type LeadershipNarrativeValues = z.infer<typeof leadershipNarrativeSchema>;

/** The eight leadership commitments mandated by ISO 27001 clause 5.1 (a)-(h). */
export interface LeadershipCommitmentMeta {
  key: string;
  label: string;
  clause: string;
  placeholder: string;
}

export const LEADERSHIP_COMMITMENTS: LeadershipCommitmentMeta[] = [
  {
    key: 'a',
    clause: '5.1 (a)',
    label: 'Policy & objectives aligned to strategy',
    placeholder:
      'How the information security policy and objectives are established and aligned with the strategic direction of the organization.',
  },
  {
    key: 'b',
    clause: '5.1 (b)',
    label: 'ISMS integrated into business processes',
    placeholder:
      'How ISMS requirements are integrated into the organization’s business processes.',
  },
  {
    key: 'c',
    clause: '5.1 (c)',
    label: 'Resources made available',
    placeholder: 'How the resources needed for the ISMS are made available.',
  },
  {
    key: 'd',
    clause: '5.1 (d)',
    label: 'Importance of effective security communicated',
    placeholder:
      'How the importance of effective information security management and conforming to ISMS requirements is communicated.',
  },
  {
    key: 'e',
    clause: '5.1 (e)',
    label: 'ISMS achieves intended outcomes',
    placeholder: 'How leadership ensures the ISMS achieves its intended outcome(s).',
  },
  {
    key: 'f',
    clause: '5.1 (f)',
    label: 'Persons directed & supported',
    placeholder:
      'How persons are directed and supported to contribute to the effectiveness of the ISMS.',
  },
  {
    key: 'g',
    clause: '5.1 (g)',
    label: 'Continual improvement promoted',
    placeholder: 'How continual improvement of the ISMS is promoted.',
  },
  {
    key: 'h',
    clause: '5.1 (h)',
    label: 'Other relevant management roles supported',
    placeholder:
      'How other relevant management roles are supported to demonstrate leadership in their areas of responsibility.',
  },
];

/**
 * Merge the persisted narrative with the canonical (a)-(h) commitment list so the
 * form always renders all eight rows in a stable order, even when generation has
 * not yet populated every clause.
 */
export function buildFormValues(
  narrative: Partial<LeadershipNarrativeValues> | null | undefined,
): LeadershipNarrativeValues {
  const persisted = Array.isArray(narrative?.commitments) ? narrative.commitments : [];
  const byKey = new Map(persisted.map((commitment) => [commitment.key, commitment.text]));

  return {
    statement: typeof narrative?.statement === 'string' ? narrative.statement : '',
    commitments: LEADERSHIP_COMMITMENTS.map((meta) => ({
      key: meta.key,
      text: byKey.get(meta.key) ?? '',
    })),
  };
}

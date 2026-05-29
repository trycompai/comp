import { z } from 'zod';
import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput, IsmsPlatformData } from './types';

/** Narrative shape persisted in IsmsDocumentVersion.narrative for leadership_commitment (5.1). */
export const leadershipNarrativeSchema = z.object({
  statement: z.string(),
  commitments: z.array(
    z.object({
      key: z.string(),
      text: z.string(),
    }),
  ),
});

export type LeadershipNarrative = z.infer<typeof leadershipNarrativeSchema>;

/**
 * The ISO 27001:2022 clause 5.1(a)-(h) leadership commitments, parameterized with
 * the organization name. Deterministic boilerplate.
 */
function commitmentsFor(
  organizationName: string,
): LeadershipNarrative['commitments'] {
  return [
    {
      key: 'a',
      text: 'Ensuring the information security policy and information security objectives are established and are compatible with the strategic direction of the organization.',
    },
    {
      key: 'b',
      text: 'Ensuring the integration of the information security management system requirements into the organization’s processes.',
    },
    {
      key: 'c',
      text: 'Ensuring that the resources needed for the information security management system are available.',
    },
    {
      key: 'd',
      text: 'Communicating the importance of effective information security management and of conforming to the information security management system requirements.',
    },
    {
      key: 'e',
      text: 'Ensuring that the information security management system achieves its intended outcome(s).',
    },
    {
      key: 'f',
      text: 'Directing and supporting persons to contribute to the effectiveness of the information security management system.',
    },
    {
      key: 'g',
      text: 'Promoting continual improvement of the information security management system.',
    },
    {
      key: 'h',
      text: `Supporting other relevant management roles within ${organizationName} to demonstrate their leadership as it applies to their areas of responsibility.`,
    },
  ];
}

/**
 * Derive the default leadership-and-commitment statement (5.1). Sign-off uses the
 * existing document approver flow.
 */
export function deriveLeadershipNarrative(
  data: IsmsPlatformData,
): LeadershipNarrative {
  return {
    statement: `Top management of ${data.organizationName} is committed to the information security management system (ISMS) and demonstrates leadership and commitment with respect to the ISMS by:`,
    commitments: commitmentsFor(data.organizationName),
  };
}

export function buildLeadershipSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const parsed = leadershipNarrativeSchema.safeParse(input.narrative);
  if (!parsed.success) {
    return [
      {
        heading: 'Leadership and Commitment',
        emptyText: 'No leadership statement saved.',
      },
    ];
  }
  const narrative = parsed.data;

  return [
    {
      heading: 'Leadership and Commitment',
      paragraphs: [
        { text: narrative.statement },
        ...narrative.commitments.map((commitment) => ({
          label: `(${commitment.key}) `,
          text: commitment.text,
        })),
      ],
    },
  ];
}

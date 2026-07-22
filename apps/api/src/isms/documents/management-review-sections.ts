import type { IsmsExportSection } from '../utils/export-shared';
import type { DocumentExportInput, ReviewExportRow } from './types';
import { managementReviewNarrativeSchema } from './management-review';

function parseProcedure(narrative: unknown): string | null {
  const parsed = managementReviewNarrativeSchema.safeParse(narrative);
  return parsed.success ? parsed.data.procedure : null;
}

const ACTION_TABLE_HEADERS = [
  'Reference',
  'Description',
  'Owner',
  'Due date',
  'Status',
];

function actionRows(actions: ReviewExportRow['actions']): string[][] {
  return actions.map((action) => [
    action.reference,
    action.description,
    action.ownerName,
    action.dueDate,
    action.status,
  ]);
}

/**
 * Per-review sections: meeting details, carried-forward actions, the Inputs
 * (9.3.2) table, the Outputs (9.3.3) trio, Conclusion, and Sign-off — the
 * order the CS-726 ticket and reference document specify.
 */
function buildReviewSections(
  review: ReviewExportRow,
  suffix: string,
): IsmsExportSection[] {
  const sections: IsmsExportSection[] = [
    {
      heading: `Meeting details${suffix}`,
      keyValues: [
        { label: 'Reference', value: review.reference },
        { label: 'Meeting date', value: review.meetingDate ?? '—' },
        { label: 'Recorded on', value: review.recordedOn },
        { label: 'Chair', value: review.chairName || '—' },
        {
          label: 'Attendees',
          value: review.attendees.length > 0 ? review.attendees.join(', ') : '—',
        },
        { label: 'Status', value: review.status },
      ],
    },
  ];

  // Input (a) evidence: open actions from previous reviews, carried forward
  // automatically. Omitted entirely (not emptyText) when there is nothing to
  // carry — the first review of an ISMS has no predecessors.
  if (review.carriedForward.length > 0) {
    sections.push({
      heading: `Actions carried forward${suffix}`,
      intro:
        "Open actions from previous management reviews, carried forward automatically to this review's input (a). Their status reflects the tracking state at the time this document was generated.",
      table: {
        headers: ACTION_TABLE_HEADERS,
        rows: actionRows(review.carriedForward),
      },
    });
  }

  // The renderers show emptyText only when a section has no other content, so
  // the intro is included only when there are rows to introduce.
  if (review.inputs.length > 0) {
    sections.push({
      heading: `Inputs (9.3.2)${suffix}`,
      intro:
        'Each input required by Clause 9.3.2 was considered at the meeting. The "Where to find it" column names the location the chair and attendees referenced. The "Discussion notes" column captures what was discussed.',
      table: {
        headers: [
          'Input',
          'What it covers',
          'Where to find it',
          'Discussion notes',
          'Discussed?',
        ],
        rows: review.inputs.map((input) => [
          input.inputRef,
          input.whatItCovers,
          input.whereToFind,
          input.discussionNotes,
          input.discussed,
        ]),
      },
    });
  } else {
    sections.push({
      heading: `Inputs (9.3.2)${suffix}`,
      emptyText: 'No inputs recorded for this review.',
    });
  }

  sections.push(
    review.decisionsText
      ? {
          heading: `Decisions on continual improvement${suffix}`,
          paragraphs: [{ text: review.decisionsText }],
        }
      : {
          heading: `Decisions on continual improvement${suffix}`,
          emptyText: 'No decisions recorded.',
        },
    review.changesText
      ? {
          heading: `ISMS changes required${suffix}`,
          paragraphs: [{ text: review.changesText }],
        }
      : {
          heading: `ISMS changes required${suffix}`,
          emptyText: 'No ISMS changes recorded.',
        },
    review.actions.length > 0
      ? {
          heading: `Actions arising${suffix}`,
          intro:
            "Actions arising from this review, tracked to closure in Comp AI. Open actions carry forward automatically to the next review's input (a).",
          table: {
            headers: ACTION_TABLE_HEADERS,
            rows: actionRows(review.actions),
          },
        }
      : {
          heading: `Actions arising${suffix}`,
          emptyText: 'No actions arising from this review.',
        },
    review.conclusion
      ? {
          heading: `Conclusion${suffix}`,
          paragraphs: [
            { text: review.conclusion },
            ...(review.conclusionNotes
              ? [{ text: review.conclusionNotes }]
              : []),
          ],
        }
      : {
          heading: `Conclusion${suffix}`,
          emptyText: 'No conclusion recorded yet.',
        },
    {
      heading: `Sign-off${suffix}`,
      table: {
        headers: ['Role', 'Signatory', 'Date'],
        rows: [
          [
            'Chair (Top Management)',
            review.signoffChairName || '—',
            review.signoffChairDate || '—',
          ],
        ],
      },
    },
  );

  return sections;
}

/**
 * Build the Management Review Procedure and Minutes document (clause 9.3).
 * Contents and order follow the CS-726 ticket and reference document: Purpose,
 * Procedure, then per review its meeting details, carried-forward actions,
 * Inputs (9.3.2), Outputs (9.3.3), Conclusion, and Sign-off. `reviews` (names
 * and labels already resolved) is populated by loadManagementReviewExtras at
 * export-input assembly (see management-review-export-data.ts). With a single
 * review the headings match the reference document verbatim; with several,
 * each block carries its reference.
 */
export function buildManagementReviewSections(
  input: DocumentExportInput,
): IsmsExportSection[] {
  const reviews = input.reviews ?? [];
  const procedure = parseProcedure(input.narrative);

  const sections: IsmsExportSection[] = [
    {
      heading: 'Purpose',
      paragraphs: [
        {
          text: 'This document records the procedure for management review of the Information Security Management System and the minutes of each management review, in accordance with ISO/IEC 27001:2022, Clause 9.3. It is retained as documented information and made available to the certification body on request.',
        },
      ],
    },
    procedure
      ? { heading: 'Procedure', paragraphs: [{ text: procedure }] }
      : { heading: 'Procedure', emptyText: 'No review procedure recorded.' },
  ];

  if (reviews.length === 0) {
    sections.push({
      heading: 'Reviews',
      emptyText: 'No management reviews recorded yet.',
    });
    return sections;
  }

  for (const review of reviews) {
    const suffix = reviews.length > 1 ? ` — ${review.reference}` : '';
    sections.push(...buildReviewSections(review, suffix));
  }

  return sections;
}

import {
  mapReviews,
  type ReviewWithExportIncludes,
} from './management-review-export-data';
import { buildManagementReviewSections } from './management-review-sections';
import type { DocumentExportInput } from './types';

jest.mock('@db', () => ({ db: {} }));

const EXTRAS = {
  memberNames: { mem_spo: 'Alex Petrisor', mem_ceo: 'Raoul Plickat' },
};

function makeReview(
  overrides: Partial<ReviewWithExportIncludes> = {},
): ReviewWithExportIncludes {
  return {
    id: 'mr_1',
    documentId: 'doc_1',
    reference: 'MR-2026-01',
    meetingDate: new Date('2026-05-01T00:00:00.000Z'),
    recordedAt: new Date('2026-05-01T09:30:00.000Z'),
    chairName: 'Raoul Plickat (CEO)',
    attendees: [
      { memberId: 'mem_ceo', name: 'Raoul Plickat' },
      { memberId: 'mem_spo', name: 'Alex Petrisor' },
    ],
    status: 'complete',
    conclusionVerdict: 'effective',
    conclusionNotes: null,
    decisionsText: 'Two improvements agreed.',
    changesText: 'No changes to the ISMS.',
    signoffChairName: 'Raoul Plickat',
    signoffChairDate: new Date('2026-05-01T00:00:00.000Z'),
    position: 0,
    createdAt: new Date('2026-05-01T09:30:00.000Z'),
    updatedAt: new Date('2026-05-01T09:30:00.000Z'),
    inputs: [],
    actions: [],
    ...overrides,
  } as ReviewWithExportIncludes;
}

function makeAction(
  overrides: Partial<ReviewWithExportIncludes['actions'][number]> = {},
): ReviewWithExportIncludes['actions'][number] {
  return {
    id: 'mra_1',
    reviewId: 'mr_1',
    documentId: 'doc_1',
    reference: 'A01',
    description: 'Formalise quarterly access review.',
    ownerMemberId: 'mem_spo',
    dueDate: new Date('2026-06-30T00:00:00.000Z'),
    status: 'open',
    position: 0,
    createdAt: new Date('2026-05-01T09:30:00.000Z'),
    updatedAt: new Date('2026-05-01T09:30:00.000Z'),
    ...overrides,
  } as ReviewWithExportIncludes['actions'][number];
}

describe('mapReviews', () => {
  it('resolves names, labels, dates, and the full action reference', () => {
    const [row] = mapReviews([makeReview({ actions: [makeAction()] })], EXTRAS);

    expect(row.reference).toBe('MR-2026-01');
    expect(row.meetingDate).toBe('2026-05-01');
    expect(row.recordedOn).toBe('2026-05-01');
    expect(row.attendees).toEqual(['Raoul Plickat', 'Alex Petrisor']);
    expect(row.status).toBe('Complete');
    expect(row.conclusion).toContain('was reviewed on 2026-05-01');
    expect(row.conclusion).toContain('found to be effective');
    expect(row.actions).toEqual([
      {
        reference: 'MR-2026-01-A01',
        description: 'Formalise quarterly access review.',
        ownerName: 'Alex Petrisor',
        dueDate: '2026-06-30',
        status: 'Open',
      },
    ]);
  });

  it('renders Yes/No for discussed inputs and dashes-free empty notes', () => {
    const [row] = mapReviews(
      [
        makeReview({
          inputs: [
            {
              id: 'mri_1',
              reviewId: 'mr_1',
              documentId: 'doc_1',
              inputKey: 'a_prior_actions',
              inputRef: '(a) Prior actions',
              whatItCovers: 'Status of actions.',
              whereToFind: 'Comp AI > ISMS > Management Review',
              discussionNotes: null,
              discussed: true,
              source: 'derived',
              derivedFrom: 'seed:a_prior_actions',
              position: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ] as ReviewWithExportIncludes['inputs'],
        }),
      ],
      EXTRAS,
    );
    expect(row.inputs[0]).toMatchObject({
      inputRef: '(a) Prior actions',
      discussionNotes: '',
      discussed: 'Yes',
    });
  });

  it('tolerates a malformed attendees JSON value and a missing owner', () => {
    const [row] = mapReviews(
      [
        makeReview({
          attendees: 'garbage',
          actions: [makeAction({ ownerMemberId: 'mem_gone' })],
        }),
      ],
      EXTRAS,
    );
    expect(row.attendees).toEqual([]);
    expect(row.actions[0].ownerName).toBe('Former member');
  });

  it('carries OPEN actions from earlier reviews into later reviews only', () => {
    const first = makeReview({
      id: 'mr_1',
      reference: 'MR-2025-01',
      actions: [
        makeAction({ reference: 'A01', status: 'open' }),
        makeAction({ id: 'mra_2', reference: 'A02', status: 'closed' }),
        makeAction({ id: 'mra_3', reference: 'A03', status: 'in_progress' }),
      ],
    });
    const second = makeReview({ id: 'mr_2', reference: 'MR-2026-01' });

    const [firstRow, secondRow] = mapReviews([first, second], EXTRAS);

    expect(firstRow.carriedForward).toEqual([]);
    expect(secondRow.carriedForward.map((action) => action.reference)).toEqual([
      'MR-2025-01-A01',
      'MR-2025-01-A03',
    ]);
  });
});

describe('buildManagementReviewSections', () => {
  const baseInput = {
    contextIssues: [],
    interestedParties: [],
    requirements: [],
    objectives: [],
    narrative: { procedure: 'We review annually.' },
  } as DocumentExportInput;

  it('renders Purpose, Procedure, and the no-reviews empty state', () => {
    const sections = buildManagementReviewSections({
      ...baseInput,
      reviews: [],
    });
    expect(sections.map((section) => section.heading)).toEqual([
      'Purpose',
      'Procedure',
      'Reviews',
    ]);
    expect(sections[1].paragraphs?.[0].text).toBe('We review annually.');
    expect(sections[2].emptyText).toBe('No management reviews recorded yet.');
  });

  it('renders every per-review section in ticket order for a single review', () => {
    const [reviewRow] = mapReviews(
      [makeReview({ actions: [makeAction()] })],
      EXTRAS,
    );
    const sections = buildManagementReviewSections({
      ...baseInput,
      reviews: [reviewRow],
    });
    expect(sections.map((section) => section.heading)).toEqual([
      'Purpose',
      'Procedure',
      'Meeting details',
      'Inputs (9.3.2)',
      'Decisions on continual improvement',
      'ISMS changes required',
      'Actions arising',
      'Conclusion',
      'Sign-off',
    ]);
    const signoff = sections[sections.length - 1];
    expect(signoff.table?.rows).toEqual([
      ['Chair (Top Management)', 'Raoul Plickat', '2026-05-01'],
    ]);
  });

  it('adds the carried-forward section and reference suffixes with several reviews', () => {
    const rows = mapReviews(
      [
        makeReview({
          id: 'mr_1',
          reference: 'MR-2025-01',
          actions: [makeAction()],
        }),
        makeReview({ id: 'mr_2', reference: 'MR-2026-01' }),
      ],
      EXTRAS,
    );
    const sections = buildManagementReviewSections({
      ...baseInput,
      reviews: rows,
    });
    const headings = sections.map((section) => section.heading);
    expect(headings).toContain('Meeting details — MR-2025-01');
    expect(headings).toContain('Actions carried forward — MR-2026-01');
    expect(headings).not.toContain('Actions carried forward — MR-2025-01');
  });

  it('falls back to emptyText for a bare review and a missing procedure', () => {
    const [reviewRow] = mapReviews(
      [
        makeReview({
          conclusionVerdict: null,
          decisionsText: null,
          changesText: null,
          signoffChairName: null,
          signoffChairDate: null,
        }),
      ],
      EXTRAS,
    );
    const sections = buildManagementReviewSections({
      ...baseInput,
      narrative: null,
      reviews: [reviewRow],
    });
    const byHeading = new Map(
      sections.map((section) => [section.heading, section]),
    );
    expect(byHeading.get('Procedure')?.emptyText).toBe(
      'No review procedure recorded.',
    );
    expect(byHeading.get('Inputs (9.3.2)')?.emptyText).toBe(
      'No inputs recorded for this review.',
    );
    expect(byHeading.get('Actions arising')?.emptyText).toBe(
      'No actions arising from this review.',
    );
    expect(byHeading.get('Conclusion')?.emptyText).toBe(
      'No conclusion recorded yet.',
    );
    expect(byHeading.get('Sign-off')?.table?.rows).toEqual([
      ['Chair (Top Management)', '—', '—'],
    ]);
  });
});

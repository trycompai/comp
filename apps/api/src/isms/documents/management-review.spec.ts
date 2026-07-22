import type { Prisma } from '@db';
import {
  dedupeReviewAttendees,
  deriveManagementReviewNarrative,
  isReviewSigned,
  parseReviewAttendees,
  reviewValidationMessages,
  seedReviewInputsIfMissing,
} from './management-review';
import {
  defaultProcedureText,
  reviewConclusionSentence,
  SEED_REVIEW_INPUT_DEFINITIONS,
} from './management-review-defaults';
import type { IsmsPlatformData } from './types';

const PLATFORM_DATA = { organizationName: 'Acme Corp' } as IsmsPlatformData;

const READY_REVIEW = {
  reference: 'MR-2026-01',
  status: 'complete',
  hasMeetingDate: true,
  hasChair: true,
  attendeeCount: 2,
  undiscussedInputCount: 0,
  signed: true,
};

describe('deriveManagementReviewNarrative', () => {
  it('seeds the Procedure paragraph with the organization name', () => {
    expect(deriveManagementReviewNarrative(PLATFORM_DATA)).toEqual({
      procedure: defaultProcedureText('Acme Corp'),
    });
    expect(defaultProcedureText('Acme Corp')).toContain(
      'Acme Corp holds a management review of the ISMS at least annually',
    );
  });
});

describe('reviewConclusionSentence', () => {
  it('renders the chosen verdict and the meeting date', () => {
    expect(
      reviewConclusionSentence({ verdict: 'effective', meetingDate: '2026-05-01' }),
    ).toBe(
      'The information security management system was reviewed on 2026-05-01. Overall, the ISMS was found to be effective and no changes are required except those recorded in the outputs section below.',
    );
  });

  it('omits the date clause while the meeting date is not set', () => {
    expect(
      reviewConclusionSentence({ verdict: 'suitable', meetingDate: null }),
    ).toContain('was reviewed. Overall, the ISMS was found to be suitable');
  });
});

describe('parseReviewAttendees / isReviewSigned', () => {
  it('parses a stored attendees array and rejects malformed values', () => {
    expect(
      parseReviewAttendees([{ memberId: 'mem_1', name: 'Jane' }]),
    ).toEqual([{ memberId: 'mem_1', name: 'Jane' }]);
    expect(parseReviewAttendees(null)).toEqual([]);
    expect(parseReviewAttendees('not-an-array')).toEqual([]);
    expect(parseReviewAttendees([{ memberId: 'mem_1' }])).toEqual([]);
  });

  it('dedupes attendees by member, first occurrence winning', () => {
    expect(
      dedupeReviewAttendees([
        { memberId: 'm1', name: 'Jane' },
        { memberId: 'm2', name: 'Ada' },
        { memberId: 'm1', name: 'Jane (dup)' },
      ]),
    ).toEqual([
      { memberId: 'm1', name: 'Jane' },
      { memberId: 'm2', name: 'Ada' },
    ]);
  });

  it('treats a review as signed only when both name and date are set', () => {
    expect(
      isReviewSigned({ signoffChairName: 'Jane', signoffChairDate: '2026-05-01' }),
    ).toBe(true);
    expect(
      isReviewSigned({ signoffChairName: '  ', signoffChairDate: '2026-05-01' }),
    ).toBe(false);
    expect(
      isReviewSigned({ signoffChairName: 'Jane', signoffChairDate: null }),
    ).toBe(false);
  });
});

describe('reviewValidationMessages', () => {
  it('requires the procedure paragraph and at least one review', () => {
    expect(reviewValidationMessages({ procedure: '  ', reviews: [] })).toEqual([
      'The review procedure paragraph must not be empty.',
      'At least one management review must be recorded.',
    ]);
  });

  it('returns no messages for a signed, fully-discussed complete review', () => {
    expect(
      reviewValidationMessages({
        procedure: 'We review annually.',
        reviews: [READY_REVIEW],
      }),
    ).toEqual([]);
  });

  it('never blocks on planned / in-progress reviews (agenda packs)', () => {
    expect(
      reviewValidationMessages({
        procedure: 'We review annually.',
        reviews: [
          {
            ...READY_REVIEW,
            status: 'planned',
            hasMeetingDate: false,
            hasChair: false,
            attendeeCount: 0,
            undiscussedInputCount: 10,
            signed: false,
          },
        ],
      }),
    ).toEqual([]);
  });

  it('lists every unmet requirement of a complete review', () => {
    const messages = reviewValidationMessages({
      procedure: 'We review annually.',
      reviews: [
        {
          ...READY_REVIEW,
          hasMeetingDate: false,
          hasChair: false,
          attendeeCount: 0,
          undiscussedInputCount: 3,
          signed: false,
        },
      ],
    });
    expect(messages).toEqual([
      'Review MR-2026-01 is complete but has no meeting date.',
      'Review MR-2026-01 is complete but has no chair.',
      'Review MR-2026-01 is complete but has no attendees.',
      'Review MR-2026-01 has 3 inputs not yet marked as discussed.',
      'Review MR-2026-01 is complete but has not been signed by the chair.',
    ]);
  });

  it('uses singular phrasing for one undiscussed input', () => {
    expect(
      reviewValidationMessages({
        procedure: 'We review annually.',
        reviews: [{ ...READY_REVIEW, undiscussedInputCount: 1 }],
      }),
    ).toEqual(['Review MR-2026-01 has 1 input not yet marked as discussed.']);
  });
});

describe('seedReviewInputsIfMissing', () => {
  const makeTx = (existing: Array<{ inputKey: string | null; position: number }>) => {
    const tx = {
      ismsReviewInput: {
        findMany: jest.fn().mockResolvedValue(existing),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    return tx;
  };
  const asTx = (tx: ReturnType<typeof makeTx>) =>
    tx as unknown as Prisma.TransactionClient;

  it('seeds all ten rows for a fresh review', async () => {
    const tx = makeTx([]);
    await seedReviewInputsIfMissing({
      tx: asTx(tx),
      reviewId: 'mr_1',
      documentId: 'doc_1',
    });

    const { data, skipDuplicates } =
      tx.ismsReviewInput.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data).toHaveLength(SEED_REVIEW_INPUT_DEFINITIONS.length);
    expect(data.map((row: { inputKey: string }) => row.inputKey)).toEqual(
      SEED_REVIEW_INPUT_DEFINITIONS.map((input) => input.inputKey),
    );
    expect(data[0]).toMatchObject({
      reviewId: 'mr_1',
      documentId: 'doc_1',
      inputRef: '(a) Prior actions',
      source: 'derived',
      derivedFrom: 'seed:a_prior_actions',
      position: 0,
    });
  });

  it('only creates missing seed rows, appending after existing positions', async () => {
    const tx = makeTx([
      { inputKey: 'a_prior_actions', position: 0 },
      { inputKey: null, position: 5 },
    ]);
    await seedReviewInputsIfMissing({
      tx: asTx(tx),
      reviewId: 'mr_1',
      documentId: 'doc_1',
    });

    const { data } = tx.ismsReviewInput.createMany.mock.calls[0][0];
    expect(data).toHaveLength(SEED_REVIEW_INPUT_DEFINITIONS.length - 1);
    expect(
      data.some((row: { inputKey: string }) => row.inputKey === 'a_prior_actions'),
    ).toBe(false);
    expect(data[0].position).toBe(6);
  });

  it('does nothing when every seed row already exists', async () => {
    const tx = makeTx(
      SEED_REVIEW_INPUT_DEFINITIONS.map((input, index) => ({
        inputKey: input.inputKey,
        position: index,
      })),
    );
    await seedReviewInputsIfMissing({
      tx: asTx(tx),
      reviewId: 'mr_1',
      documentId: 'doc_1',
    });
    expect(tx.ismsReviewInput.createMany).not.toHaveBeenCalled();
  });
});

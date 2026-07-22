import { describe, expect, it } from 'vitest';
import type { IsmsManagementReview } from '../isms-types';
import {
  carriedForwardActions,
  fullActionReference,
  isReviewSigned,
  parseAttendees,
  parseProcedure,
  reviewConclusionSentence,
  reviewValidationMessages,
} from './management-review-constants';

function makeReview(
  overrides: Partial<IsmsManagementReview> = {},
): IsmsManagementReview {
  return {
    id: 'mr_1',
    reference: 'MR-2026-01',
    meetingDate: '2026-05-01T00:00:00.000Z',
    recordedAt: '2026-05-01T09:30:00.000Z',
    chairName: 'Raoul Plickat',
    attendees: [{ memberId: 'm1', name: 'Raoul Plickat' }],
    status: 'complete',
    conclusionVerdict: 'effective',
    conclusionNotes: null,
    decisionsText: null,
    changesText: null,
    signoffChairName: 'Raoul Plickat',
    signoffChairDate: '2026-05-01T00:00:00.000Z',
    position: 0,
    inputs: [],
    actions: [],
    ...overrides,
  };
}

describe('reviewConclusionSentence / fullActionReference', () => {
  it('assembles the ticket sentence with the verdict and date', () => {
    expect(
      reviewConclusionSentence({ verdict: 'suitable', meetingDate: '2026-05-01' }),
    ).toBe(
      'The information security management system was reviewed on 2026-05-01. Overall, the ISMS was found to be suitable and no changes are required except those recorded in the outputs section below.',
    );
    expect(
      reviewConclusionSentence({ verdict: 'adequate', meetingDate: null }),
    ).toContain('was reviewed. Overall, the ISMS was found to be adequate');
  });

  it('composes the full action reference', () => {
    expect(fullActionReference('MR-2026-01', 'A03')).toBe('MR-2026-01-A03');
  });
});

describe('parseAttendees / isReviewSigned / parseProcedure', () => {
  it('parses valid attendees and drops malformed entries', () => {
    expect(
      parseAttendees([
        { memberId: 'm1', name: 'Jane' },
        { memberId: 'm2' },
        'garbage',
        { memberId: 'm3', name: '  ' },
      ]),
    ).toEqual([{ memberId: 'm1', name: 'Jane' }]);
    expect(parseAttendees(null)).toEqual([]);
    expect(parseAttendees('nope')).toEqual([]);
  });

  it('requires both chair name and date for signed', () => {
    expect(isReviewSigned(makeReview())).toBe(true);
    expect(isReviewSigned(makeReview({ signoffChairName: '  ' }))).toBe(false);
    expect(isReviewSigned(makeReview({ signoffChairDate: null }))).toBe(false);
  });

  it('reads the procedure out of the draft narrative', () => {
    expect(parseProcedure({ procedure: 'We review annually.' })).toBe(
      'We review annually.',
    );
    expect(parseProcedure({ programme: 'wrong doc' })).toBe('');
    expect(parseProcedure(null)).toBe('');
  });
});

describe('carriedForwardActions', () => {
  it('carries only open/in-progress actions from EARLIER reviews', () => {
    const first = makeReview({
      id: 'mr_1',
      reference: 'MR-2025-01',
      actions: [
        {
          id: 'a1',
          reviewId: 'mr_1',
          reference: 'A01',
          description: 'Open action',
          ownerMemberId: null,
          dueDate: null,
          status: 'open',
          position: 0,
        },
        {
          id: 'a2',
          reviewId: 'mr_1',
          reference: 'A02',
          description: 'Closed action',
          ownerMemberId: null,
          dueDate: null,
          status: 'closed',
          position: 1,
        },
      ],
    });
    const second = makeReview({ id: 'mr_2', reference: 'MR-2026-01' });

    expect(carriedForwardActions([first, second], first)).toEqual([]);
    const carried = carriedForwardActions([first, second], second);
    expect(carried).toHaveLength(1);
    expect(carried[0].action.reference).toBe('A01');
    expect(carried[0].review.reference).toBe('MR-2025-01');
  });
});

describe('reviewValidationMessages', () => {
  it('requires the procedure and at least one review', () => {
    expect(reviewValidationMessages({ procedure: ' ', reviews: [] })).toEqual([
      'The review procedure paragraph must not be empty.',
      'At least one management review must be recorded.',
    ]);
  });

  it('passes a signed, fully-discussed complete review', () => {
    expect(
      reviewValidationMessages({
        procedure: 'We review annually.',
        reviews: [makeReview()],
      }),
    ).toEqual([]);
  });

  it('never blocks on planned reviews (agenda packs)', () => {
    expect(
      reviewValidationMessages({
        procedure: 'We review annually.',
        reviews: [
          makeReview({
            status: 'planned',
            meetingDate: null,
            chairName: null,
            attendees: [],
            signoffChairName: null,
            signoffChairDate: null,
          }),
        ],
      }),
    ).toEqual([]);
  });

  it('lists every unmet requirement of a complete review', () => {
    const messages = reviewValidationMessages({
      procedure: 'We review annually.',
      reviews: [
        makeReview({
          meetingDate: null,
          chairName: null,
          attendees: [],
          signoffChairName: null,
          signoffChairDate: null,
          inputs: [
            {
              id: 'i1',
              reviewId: 'mr_1',
              inputKey: null,
              inputRef: '(a)',
              whatItCovers: '',
              whereToFind: '',
              discussionNotes: null,
              discussed: false,
              source: 'manual',
              derivedFrom: null,
              position: 0,
            },
          ],
        }),
      ],
    });
    expect(messages).toEqual([
      'Review MR-2026-01 is complete but has no meeting date.',
      'Review MR-2026-01 is complete but has no chair.',
      'Review MR-2026-01 is complete but has no attendees.',
      'Review MR-2026-01 has 1 input not yet marked as discussed.',
      'Review MR-2026-01 is complete but has not been signed by the chair.',
    ]);
  });
});

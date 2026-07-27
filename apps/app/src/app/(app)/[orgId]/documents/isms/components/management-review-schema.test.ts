import { describe, expect, it } from 'vitest';
import {
  reviewActionSchema,
  reviewDetailsSchema,
  reviewInputSchema,
  toActionPayload,
  toInputPayload,
  toOutputsPayload,
  toReviewPayload,
  toReviewSignoffPayload,
} from './management-review-schema';

describe('reviewDetailsSchema / toReviewPayload', () => {
  it('accepts empty optional fields and the empty verdict', () => {
    const parsed = reviewDetailsSchema.safeParse({
      meetingDate: '',
      chairName: '',
      status: 'planned',
      conclusionVerdict: '',
      conclusionNotes: '',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown verdict', () => {
    const parsed = reviewDetailsSchema.safeParse({
      meetingDate: '',
      chairName: '',
      status: 'planned',
      conclusionVerdict: 'conform', // the 9.2 enum, not the 9.3 one
      conclusionNotes: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('maps empty strings to null (the register "clear" contract)', () => {
    expect(
      toReviewPayload({
        meetingDate: '',
        chairName: '',
        status: 'complete',
        conclusionVerdict: 'effective',
        conclusionNotes: '',
      }),
    ).toEqual({
      meetingDate: null,
      chairName: null,
      status: 'complete',
      conclusionVerdict: 'effective',
      conclusionNotes: null,
    });
  });
});

describe('input / action / outputs / sign-off payloads', () => {
  it('requires an input reference', () => {
    expect(
      reviewInputSchema.safeParse({
        inputRef: '  ',
        whatItCovers: '',
        whereToFind: '',
        discussionNotes: '',
      }).success,
    ).toBe(false);
  });

  it('maps input notes empty string to null', () => {
    expect(
      toInputPayload({
        inputRef: '(h) Custom',
        whatItCovers: 'w',
        whereToFind: 'x',
        discussionNotes: '',
      }),
    ).toEqual({
      inputRef: '(h) Custom',
      whatItCovers: 'w',
      whereToFind: 'x',
      discussionNotes: null,
    });
  });

  it('requires an action description', () => {
    expect(
      reviewActionSchema.safeParse({
        description: ' ',
        ownerMemberId: '',
        dueDate: '',
        status: 'open',
      }).success,
    ).toBe(false);
  });

  it('maps unset action owner/due date to null', () => {
    expect(
      toActionPayload({
        description: 'Do the thing',
        ownerMemberId: '',
        dueDate: '',
        status: 'open',
      }),
    ).toEqual({
      description: 'Do the thing',
      ownerMemberId: null,
      dueDate: null,
      status: 'open',
    });
  });

  it('maps cleared outputs and sign-off fields to null', () => {
    expect(toOutputsPayload({ decisionsText: '', changesText: 'kept' })).toEqual({
      decisionsText: null,
      changesText: 'kept',
    });
    expect(
      toReviewSignoffPayload({ signoffChairName: '', signoffChairDate: '' }),
    ).toEqual({ signoffChairName: null, signoffChairDate: null });
  });
});

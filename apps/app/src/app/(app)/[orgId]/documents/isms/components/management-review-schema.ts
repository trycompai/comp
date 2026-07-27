import { z } from 'zod';
import {
  REVIEW_ACTION_STATUSES,
  REVIEW_CONCLUSION_VERDICTS,
  REVIEW_STATUSES,
} from './management-review-constants';

/**
 * Canonical zod schemas for the Management Review forms (clause 9.3). Empty
 * strings stand in for "not set" while editing; the payload mappers convert
 * them to null for the register API (which treats null as "clear").
 */

export const reviewDetailsSchema = z.object({
  meetingDate: z.string(),
  chairName: z.string(),
  status: z.enum(REVIEW_STATUSES),
  conclusionVerdict: z.union([
    z.enum(REVIEW_CONCLUSION_VERDICTS),
    z.literal(''),
  ]),
  conclusionNotes: z.string(),
});

export type ReviewDetailsFormValues = z.infer<typeof reviewDetailsSchema>;

export function toReviewPayload(values: ReviewDetailsFormValues) {
  return {
    meetingDate: values.meetingDate || null,
    chairName: values.chairName || null,
    status: values.status,
    conclusionVerdict: values.conclusionVerdict || null,
    conclusionNotes: values.conclusionNotes || null,
  };
}

export const reviewOutputsSchema = z.object({
  decisionsText: z.string(),
  changesText: z.string(),
});

export type ReviewOutputsFormValues = z.infer<typeof reviewOutputsSchema>;

export function toOutputsPayload(values: ReviewOutputsFormValues) {
  return {
    decisionsText: values.decisionsText || null,
    changesText: values.changesText || null,
  };
}

export const reviewInputSchema = z.object({
  inputRef: z.string().trim().min(1, 'Input reference is required'),
  whatItCovers: z.string(),
  whereToFind: z.string(),
  discussionNotes: z.string(),
});

export type ReviewInputFormValues = z.infer<typeof reviewInputSchema>;

export function toInputPayload(values: ReviewInputFormValues) {
  return {
    inputRef: values.inputRef,
    whatItCovers: values.whatItCovers,
    whereToFind: values.whereToFind,
    discussionNotes: values.discussionNotes || null,
  };
}

export const reviewActionSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  ownerMemberId: z.string(),
  dueDate: z.string(),
  status: z.enum(REVIEW_ACTION_STATUSES),
});

export type ReviewActionFormValues = z.infer<typeof reviewActionSchema>;

export function toActionPayload(values: ReviewActionFormValues) {
  return {
    description: values.description,
    ownerMemberId: values.ownerMemberId || null,
    dueDate: values.dueDate || null,
    status: values.status,
  };
}

export const reviewSignoffSchema = z.object({
  signoffChairName: z.string(),
  signoffChairDate: z.string(),
});

export type ReviewSignoffFormValues = z.infer<typeof reviewSignoffSchema>;

export function toReviewSignoffPayload(values: ReviewSignoffFormValues) {
  return {
    signoffChairName: values.signoffChairName || null,
    signoffChairDate: values.signoffChairDate || null,
  };
}

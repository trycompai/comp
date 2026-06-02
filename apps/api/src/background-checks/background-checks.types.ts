import { z } from 'zod';

export const backgroundCheckStatuses = [
  'invited',
  'in_progress',
  'in_review',
  'completed',
  'completed_with_flags',
  'failed',
  'cancelled',
] as const;

export const identityCreateResponseSchema = z.object({
  id: z.string(),
  status: z.enum(backgroundCheckStatuses),
  candidateUrl: z.string().url().nullable().optional(),
});

export const identityWebhookPayloadSchema = z.object({
  eventId: z.string(),
  type: z.string(),
  apiVersion: z.string().optional(),
  data: z.object({
    id: z.string(),
    status: z.enum(backgroundCheckStatuses),
    candidateName: z.string().optional(),
    candidateEmail: z.string().email().optional(),
    metadata: z.object({
      source: z.string().optional(),
      compOrganizationId: z.string(),
      compMemberId: z.string(),
    }),
    statuses: z
      .object({
        identity: z.string().optional(),
        employment: z.string().optional(),
        references: z.string().optional(),
        rightToWork: z.string().optional(),
        adjudication: z.string().optional(),
      })
      .optional(),
    createdAt: z.number().nullable().optional(),
    updatedAt: z.number().nullable().optional(),
    completedAt: z.number().nullable().optional(),
  }),
});

export type IdentityCreateResponse = z.infer<
  typeof identityCreateResponseSchema
>;
export type IdentityWebhookPayload = z.infer<
  typeof identityWebhookPayloadSchema
>;
export type BackgroundCheckStatusValue =
  (typeof backgroundCheckStatuses)[number];

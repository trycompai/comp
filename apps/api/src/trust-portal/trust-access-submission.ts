import { createHash } from 'crypto';
import { tasks } from '@trigger.dev/sdk';
import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { isEmail } from 'class-validator';
import type { processTrustAccessSubmission } from '../trigger/trust-portal/process-access-submission';

const baseFields = {
  organizationId: z.string().min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((email) => isEmail(email), {
      message: 'Invalid email',
    }),
};

export const trustAccessSubmissionSchema = z.discriminatedUnion('kind', [
  z.object({
    ...baseFields,
    kind: z.literal('request'),
    request: z.object({
      name: z.string().min(1),
      company: z.string().nullish(),
      jobTitle: z.string().nullish(),
      purpose: z.string().nullish(),
      requestedDurationDays: z.number().int().min(1).nullish(),
    }),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),
  z.object({
    ...baseFields,
    kind: z.literal('reclaim'),
    query: z.string().optional(),
  }),
]);

export type TrustAccessSubmission = z.infer<typeof trustAccessSubmissionSchema>;

export function trustAccessRecipientKey(params: {
  organizationId: string;
  email: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        params.organizationId,
        params.email.trim().toLowerCase(),
      ]),
    )
    .digest('hex');
}

/** Every valid submission takes the same queue path, before email-state lookups. */
export async function enqueueTrustAccessSubmission(
  submission: TrustAccessSubmission,
): Promise<void> {
  const parsed = trustAccessSubmissionSchema.safeParse(submission);
  if (!parsed.success) {
    throw new BadRequestException('Invalid trust access submission');
  }
  const payload = parsed.data;
  const recipientKey = trustAccessRecipientKey(payload);
  try {
    await tasks.trigger<typeof processTrustAccessSubmission>(
      'trust-portal-process-access-submission',
      payload,
      {
        // One request and one reclaim per recipient/portal every five minutes.
        // Neither deduplication nor HTTP completion depends on access state.
        idempotencyKey: `trust-access:${payload.kind}:${recipientKey}`,
        idempotencyKeyTTL: '5m',
        concurrencyKey: recipientKey,
      },
    );
  } catch (error: unknown) {
    Logger.error(
      'Unable to enqueue trust access submission',
      error instanceof Error ? error.stack : undefined,
      'TrustAccessSubmission',
    );
    throw new ServiceUnavailableException(
      'Access requests are temporarily unavailable. Please try again later.',
    );
  }
}

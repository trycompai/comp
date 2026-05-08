import { logger, queue, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { resend } from '../../email/resend';
import { generateUnsubscribeToken } from '@trycompai/email';

const RESEND_BATCH_LIMIT = 100;

const batchEmailQueue = queue({
  name: 'send-batch-email',
  concurrencyLimit: 5,
});

const batchEmailItemSchema = z.object({
  to: z.string(),
  subject: z.string(),
  html: z.string(),
  from: z.string().optional(),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
});

export const sendBatchEmailTask = schemaTask({
  id: 'send-batch-email',
  queue: batchEmailQueue,
  retry: {
    maxAttempts: 3,
  },
  schema: z.object({
    emails: z.array(batchEmailItemSchema).min(1),
  }),
  run: async (params) => {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY');
      throw new Error('Resend not initialized - missing API key');
    }

    const fromDefault =
      process.env.RESEND_FROM_SYSTEM ?? process.env.RESEND_FROM_DEFAULT;
    const toTest = process.env.RESEND_TO_TEST;
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://api.trycomp.ai';

    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < params.emails.length; i += RESEND_BATCH_LIMIT) {
      const chunk = params.emails.slice(i, i + RESEND_BATCH_LIMIT);

      const payload = chunk.map((email) => {
        const token = generateUnsubscribeToken(email.to);
        const oneClickUrl = `${apiBaseUrl}/v1/email/unsubscribe?email=${encodeURIComponent(email.to)}&token=${encodeURIComponent(token)}`;

        return {
          from: email.from ?? fromDefault ?? '',
          to: toTest ?? email.to,
          cc: email.cc,
          subject: email.subject,
          html: email.html,
          headers: {
            'List-Unsubscribe': `<${oneClickUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        };
      });

      const { data, error } = await resend.batch.send(payload, {
        batchValidation: 'permissive',
      });

      if (error) {
        logger.error('Resend batch API error', {
          error,
          chunkIndex: i,
          chunkSize: chunk.length,
        });
        totalFailed += chunk.length;
        continue;
      }

      const sent = data?.data?.length ?? 0;
      totalSent += sent;

      if ('errors' in data && Array.isArray(data.errors)) {
        for (const err of data.errors) {
          logger.warn('Batch email failed for recipient', {
            index: err.index,
            message: err.message,
            to: chunk[err.index]?.to,
          });
          totalFailed += 1;
          totalSent -= 1;
        }
      }

      logger.info('Batch chunk sent', {
        chunkIndex: i,
        chunkSize: chunk.length,
        sent,
      });
    }

    logger.info('Batch email task complete', { totalSent, totalFailed });
    return { totalSent, totalFailed };
  },
});

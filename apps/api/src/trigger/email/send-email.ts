import { logger, queue, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { resend } from '../../email/resend';
import { generateUnsubscribeToken } from '@trycompai/email';

const emailQueue = queue({
  name: 'send-email',
  concurrencyLimit: 10,
});

export const sendEmailTask = schemaTask({
  id: 'send-email',
  queue: emailQueue,
  retry: {
    maxAttempts: 3,
  },
  schema: z.object({
    to: z.string(),
    subject: z.string(),
    html: z.string(),
    from: z.string().optional(),
    cc: z.union([z.string(), z.array(z.string())]).optional(),
    scheduledAt: z.string().optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          content: z.string(),
          contentType: z.string().optional(),
        }),
      )
      .optional(),
  }),
  run: async (params) => {
    if (!resend) {
      logger.error('Resend not initialized - missing RESEND_API_KEY', {
        to: params.to,
        subject: params.subject,
      });
      throw new Error('Resend not initialized - missing API key');
    }

    const fromSystem = process.env.RESEND_FROM_SYSTEM;
    const fromDefault = process.env.RESEND_FROM_DEFAULT;
    const toTest = process.env.RESEND_TO_TEST;

    const fromAddress = params.from ?? fromSystem ?? fromDefault;
    const toAddress = toTest ?? params.to;

    if (!fromAddress) {
      throw new Error('Missing FROM address in environment variables');
    }

    try {
      // Build List-Unsubscribe headers for Gmail/RFC 8058 one-click compliance
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.trycomp.ai';
      const token = generateUnsubscribeToken(params.to);
      const oneClickUrl = `${apiBaseUrl}/v1/email/unsubscribe?email=${encodeURIComponent(params.to)}&token=${encodeURIComponent(token)}`;
      const headers: Record<string, string> = {
        'List-Unsubscribe': `<${oneClickUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: toAddress,
        cc: params.cc,
        subject: params.subject,
        html: params.html,
        headers,
        scheduledAt: params.scheduledAt,
        attachments: params.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      if (error) {
        logger.error('Resend API error', {
          error,
          to: params.to,
          subject: params.subject,
        });
        throw new Error(`Failed to send email: ${error.message}`);
      }

      logger.info('Email sent', { to: params.to, id: data?.id });

      // Throttle: hold the concurrency slot for 1s to space out sends
      await new Promise((r) => setTimeout(r, 1000));

      return { id: data?.id };
    } catch (error) {
      logger.error('Email sending failed', {
        to: params.to,
        subject: params.subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
});

import { db } from '@db';
import { logger, queue, task } from '@trigger.dev/sdk';
import { sendWeeklyTaskDigestEmail } from '@trycompai/email/lib/weekly-task-digest';
import { isUserUnsubscribed } from '@comp/email/lib/check-unsubscribe';

// Queue with concurrency limit to prevent rate limiting
const weeklyTaskDigestQueue = queue({
  name: 'weekly-task-digest-queue',
  concurrencyLimit: 2, // Max 2 emails at a time
});

interface WeeklyTaskDigestPayload {
  email: string;
  userName: string;
  organizationName: string;
  organizationId: string;
  tasks: Array<{
    id: string;
    title: string;
  }>;
}

export const sendWeeklyTaskDigestEmailTask = task({
  id: 'send-weekly-task-digest-email',
  queue: weeklyTaskDigestQueue,
  run: async (payload: WeeklyTaskDigestPayload) => {
    logger.info('Sending weekly task digest email', {
      email: payload.email,
      organizationName: payload.organizationName,
      taskCount: payload.tasks.length,
    });

    try {
      const unsubscribed = await isUserUnsubscribed(db, payload.email, 'weeklyTaskDigest');
      if (unsubscribed) {
        logger.info('User is unsubscribed from email notifications, skipping', {
          email: payload.email,
        });
        return {
          success: true,
          email: payload.email,
          skipped: true,
          reason: 'unsubscribed',
        };
      }

      await sendWeeklyTaskDigestEmail(payload);

      logger.info('Successfully sent weekly task digest email', {
        email: payload.email,
        organizationName: payload.organizationName,
      });

      return {
        success: true,
        email: payload.email,
      };
    } catch (error) {
      logger.error('Failed to send weekly task digest email', {
        email: payload.email,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});

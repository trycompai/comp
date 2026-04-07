import { db } from '@db/server';
import { logger, queue, tags, task } from '@trigger.dev/sdk';
import WeeklyTaskDigestEmail from '@trycompai/email/emails/reminders/weekly-task-digest';
import { isUserUnsubscribed } from '@trycompai/email/lib/check-unsubscribe';
import { sendEmailViaApi } from '../../lib/send-email-via-api';

const weeklyTaskDigestQueue = queue({
  name: 'weekly-task-digest-queue',
  concurrencyLimit: 2,
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

const getTaskCountMessage = (count: number) => {
  const plural = count !== 1 ? 's' : '';
  return `You have ${count} pending task${plural} that are not yet completed`;
};

export const sendWeeklyTaskDigestEmailTask = task({
  id: 'send-weekly-task-digest-email',
  queue: weeklyTaskDigestQueue,
  run: async (payload: WeeklyTaskDigestPayload) => {
    logger.info('Sending weekly task digest email', {
      email: payload.email,
      organizationName: payload.organizationName,
      taskCount: payload.tasks.length,
    });
    await tags.add([`org:${payload.organizationId}`]);

    try {
      const unsubscribed = await isUserUnsubscribed(db, payload.email, 'weeklyTaskDigest', payload.organizationId);
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

      await sendEmailViaApi({
        to: payload.email,
        subject: getTaskCountMessage(payload.tasks.length),
        react: WeeklyTaskDigestEmail({
          email: payload.email,
          userName: payload.userName,
          organizationName: payload.organizationName,
          organizationId: payload.organizationId,
          tasks: payload.tasks,
        }),
        organizationId: payload.organizationId,
        system: true,
      });

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

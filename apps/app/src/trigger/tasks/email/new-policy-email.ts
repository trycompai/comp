import { db } from '@db/server';
import { PolicyNotificationEmail } from '@trycompai/email';
import { isUserUnsubscribed } from '@trycompai/email/lib/check-unsubscribe';
import { logger, queue, tags, task } from '@trigger.dev/sdk';
import { sendEmailViaApi } from '../../lib/send-email-via-api';

const policyEmailQueue = queue({
  name: 'policy-email-queue',
  concurrencyLimit: 2,
});

interface PolicyEmailPayload {
  email: string;
  userName: string;
  policyName: string;
  organizationId: string;
  organizationName: string;
  notificationType: 'new' | 'updated' | 're-acceptance';
}

export const sendNewPolicyEmail = task({
  id: 'send-new-policy-email',
  queue: policyEmailQueue,
  run: async (payload: PolicyEmailPayload) => {
    logger.info('Sending new policy email', {
      email: payload.email,
      policyName: payload.policyName,
    });
    await tags.add([`org:${payload.organizationId}`]);

    try {
      const unsubscribed = await isUserUnsubscribed(db, payload.email, 'policyNotifications', payload.organizationId);
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
        subject: 'Please review and accept this policy',
        react: PolicyNotificationEmail({
          email: payload.email,
          userName: payload.userName,
          policyName: payload.policyName,
          organizationName: payload.organizationName,
          organizationId: payload.organizationId,
          notificationType: payload.notificationType,
        }),
        organizationId: payload.organizationId,
        system: true,
      });

      logger.info('Successfully sent policy email', {
        email: payload.email,
        policyName: payload.policyName,
      });

      return {
        success: true,
        email: payload.email,
      };
    } catch (error) {
      logger.error('Failed to send policy email', {
        email: payload.email,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});

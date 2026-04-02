import { db } from '@db/server';
import { AllPolicyNotificationEmail } from '@trycompai/email';
import { isUserUnsubscribed } from '@trycompai/email/lib/check-unsubscribe';
import { logger, queue, task } from '@trigger.dev/sdk';
import { sendEmailViaApi } from '../../lib/send-email-via-api';

const allPolicyEmailQueue = queue({
  name: 'all-policy-email-queue',
  concurrencyLimit: 2,
});

interface AllPolicyEmailPayload {
  email: string;
  userName: string;
  organizationId: string;
  organizationName: string;
}

export const sendPublishAllPoliciesEmail = task({
  id: 'send-publish-all-policies-email',
  queue: allPolicyEmailQueue,
  run: async (payload: AllPolicyEmailPayload) => {
    logger.info('Sending all policies published email', {
      email: payload.email,
      organizationName: payload.organizationName,
    });

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
        subject: 'Please review and accept the policies',
        react: AllPolicyNotificationEmail({
          email: payload.email,
          userName: payload.userName,
          organizationName: payload.organizationName,
          organizationId: payload.organizationId,
        }),
        organizationId: payload.organizationId,
        system: true,
      });

      logger.info('Successfully sent all policies email', {
        email: payload.email,
        organizationName: payload.organizationName,
      });

      return {
        success: true,
        email: payload.email,
      };
    } catch (error) {
      logger.error('Failed to send all policies email', {
        email: payload.email,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});

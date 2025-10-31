import { sendAllPolicyNotificationEmail } from '@comp/email';
import { logger, queue, task } from '@trigger.dev/sdk';

// Queue with concurrency limit to ensure rate limiting
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
      await sendAllPolicyNotificationEmail(payload);

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


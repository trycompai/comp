import { sendPolicyNotificationEmail } from '@comp/email';
import { logger, queue, task } from '@trigger.dev/sdk';

// Queue with concurrency limit of 1 to ensure rate limiting (1 email per second max)
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

    try {
      await sendPolicyNotificationEmail(payload);

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

import { db } from '@comp/db';
import { logger, schedules } from '@trigger.dev/sdk/v3';

// Note: Run `bunx prisma migrate dev` to generate the PaymentLink model before this job can execute
export const expirePaymentLinks = schedules.task({
  id: 'expire-payment-links',
  cron: '0 * * * *', // Run every hour
  maxDuration: 1000 * 60 * 5, // 5 minutes
  run: async () => {
    const now = new Date();

    try {
      // Find and update all expired payment links that are still PENDING
      // @ts-expect-error - PaymentLink model will be available after running migrations
      const result = await db.paymentLink.updateMany({
        where: {
          AND: [{ status: 'PENDING' }, { expiresAt: { lt: now } }],
        },
        data: {
          status: 'EXPIRED',
        },
      });

      logger.info(`Updated ${result.count} expired payment links`);

      return {
        success: true,
        expiredCount: result.count,
        timestamp: now.toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to expire payment links: ${error}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: now.toISOString(),
      };
    }
  },
});

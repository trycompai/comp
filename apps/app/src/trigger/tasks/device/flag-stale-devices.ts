import { db } from '@db/server';
import { logger, schedules } from '@trigger.dev/sdk';
import { STALE_DEVICE_THRESHOLD_DAYS } from '@trycompai/utils/devices';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const flagStaleDevices = schedules.task({
  id: 'flag-stale-devices',
  cron: '0 6 * * *', // Daily at 06:00 UTC (~01:00 US/Eastern)
  maxDuration: 60 * 5, // 5 minutes (trigger.dev expects seconds)
  run: async (): Promise<{
    success: boolean;
    flaggedCount: number;
    threshold: Date;
    error?: string;
  }> => {
    const threshold = new Date(
      Date.now() - STALE_DEVICE_THRESHOLD_DAYS * MS_PER_DAY,
    );

    try {
      const result = await db.device.updateMany({
        where: {
          isCompliant: true,
          OR: [{ lastCheckIn: null }, { lastCheckIn: { lt: threshold } }],
        },
        data: { isCompliant: false },
      });

      logger.info(
        `Flagged ${result.count} stale device(s) as non-compliant (threshold ${threshold.toISOString()})`,
      );

      return {
        success: true,
        flaggedCount: result.count,
        threshold,
      };
    } catch (error) {
      logger.error('flag-stale-devices failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        flaggedCount: 0,
        threshold,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

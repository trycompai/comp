import { db, EvidenceAutomation } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';

export const automatedEvidenceCollection = schedules.task({
  id: 'automated-evidence-collection',
  cron: '0 9 * * *', // Every day at 9 AM
  maxDuration: 1000 * 60 * 30, // 30 minutes
  run: async () => {
    logger.info('Starting automated evidence collection check');

    try {
      // Find all active automations with frequency set
      const automations = await db.evidenceAutomation.findMany({
        where: {
          status: 'active',
          frequency: {
            not: null,
          },
        },
        include: {
          task: {
            select: {
              id: true,
              status: true,
              organizationId: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Found ${automations.length} active automations to check`);

      const automationsToRun = [];

      for (const automation of automations) {
        // Only run for published tasks
        if (automation.task.status !== 'done') {
          continue;
        }

        // Check if automation is due to run based on frequency
        const isDue = isAutomationDue(automation);

        if (isDue) {
          automationsToRun.push(automation);
        }
      }

      logger.info(`${automationsToRun.length} automations are due to run`);

      // Execute automations that are due
      for (const automation of automationsToRun) {
        try {
          await executeAutomation(automation);
          logger.info(
            `Successfully executed automation ${automation.id} for task ${automation.taskId}`,
          );
        } catch (error) {
          logger.error(
            `Failed to execute automation ${automation.id}:`,
            error as Record<string, unknown>,
          );
        }
      }

      return {
        success: true,
        totalChecked: automations.length,
        totalExecuted: automationsToRun.length,
        message: `Checked ${automations.length} automations, executed ${automationsToRun.length}`,
      };
    } catch (error) {
      logger.error(
        'Failed to run automated evidence collection:',
        error as Record<string, unknown>,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to run automated evidence collection',
      };
    }
  },
});

function isAutomationDue(evidenceAutomation: EvidenceAutomation): boolean {
  const now = new Date();
  const lastRun = evidenceAutomation.lastRunAt;
  const frequency = evidenceAutomation.frequency;

  // If never run, it's due
  if (!lastRun) {
    return true;
  }

  const daysSinceLastRun = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));

  switch (frequency) {
    case 'daily':
      return daysSinceLastRun >= 1;
    case 'weekly':
      return daysSinceLastRun >= 7;
    case 'monthly':
      return daysSinceLastRun >= 30;
    case 'quarterly':
      return daysSinceLastRun >= 90;
    default:
      return false;
  }
}

async function executeAutomation(evidenceAutomation: EvidenceAutomation) {
  // Create automation run record
  const run = await db.evidenceAutomationRun.create({
    data: {
      evidenceAutomationId: evidenceAutomation.id,
      taskId: evidenceAutomation.taskId,
      status: 'running',
      startedAt: new Date(),
      triggeredBy: 'scheduled',
    },
  });

  try {
    // TODO: Implement actual automation execution
    // This would call the enterprise API to execute the automation script

    // For now, just simulate success
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update run as completed
    await db.evidenceAutomationRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        success: true,
        runDuration: Date.now() - run.startedAt!.getTime(),
      },
    });

    // Update automation's lastRunAt
    await db.evidenceAutomation.update({
      where: { id: evidenceAutomation.id },
      data: {
        lastRunAt: new Date(),
      },
    });
  } catch (error) {
    // Update run as failed
    await db.evidenceAutomationRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        runDuration: Date.now() - run.startedAt!.getTime(),
      },
    });

    throw error;
  }
}

import { db } from "@bubba/db";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { sendRiskTaskNotification } from "./risk-task-notification";

export const sendRiskTaskSchedule = schedules.task({
  id: "risk-task-schedule",
  cron: "0 * * * *",
  run: async () => {
    const now = new Date();
    const upcomingThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    logger.info(
      `Sending risk task notifications from now: ${now} to ${upcomingThreshold}`,
    );

    const tasks = await db.riskMitigationTask.findMany({
      where: {
        dueDate: { gte: now, lte: upcomingThreshold },
        status: { in: ["open", "pending"] },
        notifiedAt: null,
      },
      select: {
        id: true,
        dueDate: true,
        notifiedAt: true,
        riskId: true,
        title: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            organizationId: true,
          },
        },
      },
    });

    const triggerPayloads = tasks
      .filter(
        (
          task,
        ): task is typeof task & {
          owner: { id: string; email: string; organizationId: string };
        } => Boolean(task.owner?.email && task.owner.organizationId),
      )
      .map((task) => ({
        payload: {
          task: {
            id: task.id,
            title: task.title,
            dueDate: task.dueDate || new Date(),
            owner: task.owner,
            riskId: task.riskId,
          },
        },
      }));

    if (triggerPayloads.length > 0) {
      try {
        await sendRiskTaskNotification.batchTrigger(triggerPayloads);

        logger.info(`Triggered ${triggerPayloads.length} task notifications`);
      } catch (error) {
        logger.error(`Failed to trigger batch notifications: ${error}`);

        return {
          success: false,
          totalTasks: tasks.length,
          triggeredTasks: triggerPayloads.length,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      success: true,
      totalTasks: tasks.length,
      triggeredTasks: triggerPayloads.length,
    };
  },
});

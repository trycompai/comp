import { db } from "@bubba/db";
import {
  NotificationTypes,
  TriggerEvents,
  trigger,
} from "@bubba/notifications";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { formatDistance } from "date-fns";
import { z } from "zod";

export const sendRiskTaskNotification = schemaTask({
  id: "send-risk-task-notification",
  schema: z.object({
    task: z.object({
      id: z.string(),
      title: z.string(),
      dueDate: z.date(),
      owner: z.object({
        id: z.string(),
        email: z.string(),
        organizationId: z.string(),
      }),
      riskId: z.string(),
    }),
  }),
  run: async (payload) => {
    const { task } = payload;

    try {
      const owner = task.owner;

      const timeUntilDue = task.dueDate
        ? formatDistance(task.dueDate, new Date(), { addSuffix: true })
        : "soon";

      await db.riskMitigationTask.update({
        where: { id: task.id },
        data: { notifiedAt: new Date() },
      });

      await trigger({
        name: TriggerEvents.TaskReminderInApp,
        user: {
          subscriberId: `${owner.organizationId}_${owner.id}`,
          email: owner.email,
          fullName: owner.email,
          organizationId: owner.organizationId,
        },
        payload: {
          description: `${task.title} is due ${timeUntilDue}`,
          recordId: `/risk/${task.riskId}/tasks/${task.id}`,
          type: NotificationTypes.Task,
        },
      });
    } catch (error) {
      logger.error(`Error sending risk task notification: ${error}`);
    }
  },
});

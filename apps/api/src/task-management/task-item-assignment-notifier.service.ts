import { db } from '@db';
import { Injectable, Logger } from '@nestjs/common';
import { isUserUnsubscribed } from '@trycompai/email';
import { sendEmail } from '../email/resend';
import { TaskItemAssignedEmail } from '../email/templates/task-item-assigned';
import { NovuService } from '../notifications/novu.service';

type TaskItemEntityType = 'vendor' | 'risk';

const getEntityUrlPath = ({
  organizationId,
  entityType,
  entityId,
}: {
  organizationId: string;
  entityType: TaskItemEntityType;
  entityId: string;
}): string => {
  switch (entityType) {
    case 'vendor':
      return `/${organizationId}/vendors/${entityId}`;
    case 'risk':
      return `/${organizationId}/risk/${entityId}`;
    default:
      return `/${organizationId}`;
  }
};

@Injectable()
export class TaskItemAssignmentNotifierService {
  private readonly logger = new Logger(TaskItemAssignmentNotifierService.name);

  constructor(private readonly novuService: NovuService) {}

  async notifyAssignee(params: {
    organizationId: string;
    taskItemId: string;
    entityType: TaskItemEntityType;
    entityId: string;
    taskTitle: string;
    assigneeMemberId: string;
    assignedByUserId: string;
  }): Promise<void> {
    const {
      organizationId,
      taskItemId,
      entityType,
      entityId,
      taskTitle,
      assigneeMemberId,
      assignedByUserId,
    } = params;

    try {
      const [organization, assigneeMember, assignedByUser] = await Promise.all([
        db.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        }),
        db.member.findUnique({
          where: { id: assigneeMemberId },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        db.user.findUnique({
          where: { id: assignedByUserId },
          select: { name: true, email: true },
        }),
      ]);

      const organizationName = organization?.name ?? 'your organization';
      const assigneeUser = assigneeMember?.user;
      const assignedByName =
        assignedByUser?.name?.trim() ||
        assignedByUser?.email?.trim() ||
        'Someone';

      if (!assigneeUser?.id || !assigneeUser.email) {
        this.logger.warn(
          `Skipping assignment notification: assignee member ${assigneeMemberId} has no user/email`,
        );
        return;
      }

      // Avoid notifying the actor about their own assignment
      if (assigneeUser.id === assignedByUserId) {
        return;
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const taskUrlBase = `${appUrl}${getEntityUrlPath({
        organizationId,
        entityType,
        entityId,
      })}`;
      // Deep-link directly to the TaskItems section + select the task
      const taskUrlObj = new URL(taskUrlBase);
      taskUrlObj.searchParams.set('taskItemId', taskItemId);
      taskUrlObj.hash = 'task-items';
      const taskUrl = taskUrlObj.toString();

      const assigneeName =
        assigneeUser.name?.trim() || assigneeUser.email?.trim() || 'User';

      // Check if user is unsubscribed from task assignment notifications
      const isUnsubscribed = await isUserUnsubscribed(
        db,
        assigneeUser.email,
        'taskAssignments',
      );
      if (isUnsubscribed) {
        this.logger.log(
          `Skipping assignment notification: user ${assigneeUser.email} is unsubscribed from task assignments`,
        );
        return;
      }

      this.logger.log(
        `Sending assignment notification to assignee: ${assigneeUser.email} for task "${taskTitle}"`,
      );

      // Send email notification via Resend
      try {
        const { id } = await sendEmail({
          to: assigneeUser.email,
          subject: `You were assigned to a task: ${taskTitle}`,
          react: TaskItemAssignedEmail({
            toName: assigneeName,
            toEmail: assigneeUser.email,
            taskTitle,
            assignedByName,
            organizationName,
            taskUrl,
          }),
          system: true,
        });

        this.logger.log(
          `Assignment email sent to ${assigneeUser.email} (ID: ${id}) for task "${taskTitle}"`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send assignment email to ${assigneeUser.email}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
        throw error; // Re-throw to maintain existing error handling behavior
      }

      // Send in-app notification via Novu
      this.logger.log(
        `[NOVU] Attempting to send in-app notification to ${assigneeUser.id} (subscriber: ${assigneeUser.id}-${organizationId}) for task "${taskTitle}"`,
      );
      // Get entity route path for Novu payload
      const entityRoutePath = entityType === 'vendor' ? 'vendors' : 'risks';

      try {
        await this.novuService.trigger({
          workflowId: 'task-item-assigned',
          subscriberId: `${assigneeUser.id}-${organizationId}`,
        email: assigneeUser.email,
        payload: {
            taskTitle,
            taskItemId,
            assignedByName,
          organizationName,
          entityType,
            entityRoutePath,
          entityId,
            organizationId,
          taskUrl,
        },
      });

      this.logger.log(
          `[NOVU] Assignment in-app notification sent to ${assigneeUser.id} for task "${taskTitle}"`,
      );
      } catch (error) {
        this.logger.error(
          `[NOVU] Failed to send assignment in-app notification to ${assigneeUser.id}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
        // Don't throw - in-app notification failures should not block task operations
      }
    } catch (error) {
      this.logger.error(
        'Failed to send assignment notification',
        error as Error,
      );
    }
  }
}

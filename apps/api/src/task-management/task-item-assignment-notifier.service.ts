import { db } from '@db';
import { Injectable, Logger } from '@nestjs/common';
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

  constructor(private readonly novu: NovuService) {}

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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? 'https://app.trycomp.ai';
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

      const subscriberId = `${assigneeUser.id}-${organizationId}`;
      const workflowId = process.env.NOVU_WORKFLOW_TASK_ITEM_ASSIGNED ?? 'task-item-assigned';
      const assigneeName =
        assigneeUser.name?.trim() || assigneeUser.email?.trim() || 'User';
      const assignedByEmail = assignedByUser?.email?.trim() || null;

      this.logger.log(
        `Sending assignment notification to assignee: ${assigneeUser.email} (subscriberId: ${subscriberId}, workflow: ${workflowId}, assignedByName: ${assignedByName})`,
      );

      await this.novu.trigger({
        workflowId,
        subscriberId,
        email: assigneeUser.email,
        payload: {
          organizationId,
          organizationName,
          taskItemId,
          taskTitle,
          entityType,
          entityId,
          taskUrl,
          assignedByName,
          assigneeName,
          assigneeEmail: assigneeUser.email,
          assignedByEmail,
          assignedByUserId,
        },
      });

      this.logger.log(
        `Assignment notification sent successfully to ${assigneeUser.email} for task "${taskTitle}"`,
      );
    } catch (error) {
      this.logger.error('Failed to send assignment notification', error as Error);
    }
  }
}



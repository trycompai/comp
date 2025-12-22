import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { NovuService } from '../notifications/novu.service';

@Injectable()
export class TaskItemMentionNotifierService {
  private readonly logger = new Logger(TaskItemMentionNotifierService.name);

  constructor(private readonly novu: NovuService) {}

  /**
   * Notify mentioned users in a task item
   */
  async notifyMentionedUsers(params: {
    organizationId: string;
    taskItemId: string;
    taskTitle: string;
    entityType: string;
    entityId: string;
    mentionedUserIds: string[];
    mentionedByUserId: string;
  }): Promise<void> {
    const {
      organizationId,
      taskItemId,
      taskTitle,
      entityType,
      entityId,
      mentionedUserIds,
      mentionedByUserId,
    } = params;

    if (!mentionedUserIds || mentionedUserIds.length === 0) {
      return;
    }

    try {
      // Get the user who mentioned others
      const mentionedByUser = await db.user.findUnique({
        where: { id: mentionedByUserId },
      });

      if (!mentionedByUser) {
        this.logger.warn(
          `Cannot send mention notifications: user ${mentionedByUserId} not found`,
        );
        return;
      }

      // Get all mentioned users
      const mentionedUsers = await db.user.findMany({
        where: {
          id: { in: mentionedUserIds },
        },
      });

      // Get entity name for context
      let entityName = '';
      if (entityType === 'risk') {
        const risk = await db.risk.findUnique({
          where: { id: entityId },
          select: { title: true },
        });
        entityName = risk?.title || 'Unknown Risk';
      } else if (entityType === 'vendor') {
        const vendor = await db.vendor.findUnique({
          where: { id: entityId },
          select: { name: true },
        });
        entityName = vendor?.name || 'Unknown Vendor';
      }

      const workflowId = process.env.NOVU_WORKFLOW_TASK_ITEM_MENTIONED ?? 'task-item-mentioned';

      // Convert entity type to correct route path
      const entityRoutePath = entityType === 'vendor' ? 'vendors' : 'risks';

      this.logger.log(
        `[MENTION DEBUG] Workflow ID: ${workflowId}, Mentioned users count: ${mentionedUsers.length}`,
      );

      // Send notification to each mentioned user
      for (const user of mentionedUsers) {
        // Don't notify the user who mentioned themselves
        // if (user.id === mentionedByUserId) continue;

        this.logger.log(
          `[MENTION DEBUG] Sending notification to user ${user.id} (${user.email}) for task ${taskItemId}`,
        );

        await this.novu.trigger({
          workflowId,
          subscriberId: user.id,
          email: user.email,
          payload: {
            taskItemId,
            taskTitle,
            entityType,
            entityRoutePath, // 'vendors' or 'risk' - correct route path
            entityId,
            entityName,
            mentionedByName: mentionedByUser.name || mentionedByUser.email,
            mentionedByEmail: mentionedByUser.email,
            organizationId,
            BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || '',
          },
        });

        this.logger.log(
          `[MENTION DEBUG] Notification sent successfully to ${user.email}`,
        );
      }

      this.logger.log(
        `Sent mention notifications for task ${taskItemId} to ${mentionedUsers.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send mention notifications for task ${taskItemId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Don't throw - notification failures should not block task operations
    }
  }
}


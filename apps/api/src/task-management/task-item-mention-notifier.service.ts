import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { isUserUnsubscribed } from '@trycompai/email';
import { sendEmail } from '../email/resend';
import { TaskItemMentionedEmail } from '../email/templates/task-item-mentioned';
import { NovuService } from '../notifications/novu.service';

@Injectable()
export class TaskItemMentionNotifierService {
  private readonly logger = new Logger(TaskItemMentionNotifierService.name);

  constructor(private readonly novuService: NovuService) {}

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

      // Convert entity type to correct route path
      // Note: vendors is plural, but risk is singular in routes
      const entityRoutePath = entityType === 'vendor' ? 'vendors' : 'risk';

      // Build task URL
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const taskUrlBase = `${appUrl}/${organizationId}/${entityRoutePath}/${entityId}`;
      const taskUrlObj = new URL(taskUrlBase);
      taskUrlObj.searchParams.set('taskItemId', taskItemId);
      taskUrlObj.hash = 'task-items';
      const taskUrl = taskUrlObj.toString();

      const mentionedByName =
        mentionedByUser.name || mentionedByUser.email || 'Someone';

      this.logger.log(
        `Sending mention notifications to ${mentionedUsers.length} users for task ${taskItemId}`,
      );

      // Send email notification to each mentioned user
      for (const user of mentionedUsers) {
        // Don't notify the user who mentioned themselves
        if (user.id === mentionedByUserId) {
          continue;
        }

        if (!user.email) {
          this.logger.warn(
            `Skipping mention notification: user ${user.id} has no email`,
          );
          continue;
        }

        // Check if user is unsubscribed from task mention notifications
        const isUnsubscribed = await isUserUnsubscribed(
          db,
          user.email,
          'taskMentions',
        );
        if (isUnsubscribed) {
          this.logger.log(
            `Skipping mention notification: user ${user.email} is unsubscribed from task mentions`,
          );
          continue;
        }

        const userName = user.name || user.email || 'User';

        // Send email notification via Resend
        try {
          const { id } = await sendEmail({
            to: user.email,
            subject: `${mentionedByName} mentioned you in a task`,
            react: TaskItemMentionedEmail({
              toName: userName,
              toEmail: user.email,
              taskTitle,
              mentionedByName,
              entityName,
              entityRoutePath,
              entityId,
              organizationId,
              taskUrl,
            }),
            system: true,
          });

          this.logger.log(
            `Mention email sent to ${user.email} (ID: ${id}) for task "${taskTitle}"`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send mention email to ${user.email}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
          // Continue with other users even if one fails
        }

        // Send in-app notification via Novu
        this.logger.log(
          `[NOVU] Attempting to send in-app notification to ${user.id} (subscriber: ${user.id}-${organizationId}) for task "${taskTitle}"`,
        );
        try {
          await this.novuService.trigger({
            workflowId: 'task-item-mentioned',
            subscriberId: `${user.id}-${organizationId}`,
            email: user.email,
            payload: {
              taskTitle,
              taskItemId,
              mentionedByName,
              entityName,
              entityType,
              entityRoutePath,
              entityId,
              organizationId,
              taskUrl,
            },
          });

          this.logger.log(
            `[NOVU] Mention in-app notification sent to ${user.id} for task "${taskTitle}"`,
          );
        } catch (error) {
          this.logger.error(
            `[NOVU] Failed to send mention in-app notification to ${user.id}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
          // Continue with other users even if one fails
        }
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

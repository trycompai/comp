import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { isUserUnsubscribed } from '@trycompai/email';
import { sendEmail } from '../email/resend';
import { CommentMentionedEmail } from '../email/templates/comment-mentioned';
import { NovuService } from '../notifications/novu.service';
// Reuse the extract mentions utility
function extractMentionedUserIds(content: string | null): string[] {
  if (!content) return [];

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    if (!parsed || typeof parsed !== 'object') return [];

    const mentionedUserIds: string[] = [];
    function traverse(node: any) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'mention' && node.attrs?.id) {
        mentionedUserIds.push(node.attrs.id);
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    }
    traverse(parsed);
    return [...new Set(mentionedUserIds)];
  } catch {
    return [];
  }
}
import { CommentEntityType } from '@db';

@Injectable()
export class CommentMentionNotifierService {
  private readonly logger = new Logger(CommentMentionNotifierService.name);

  constructor(private readonly novuService: NovuService) {}

  /**
   * Notify mentioned users in a comment
   */
  async notifyMentionedUsers(params: {
    organizationId: string;
    commentId: string;
    commentContent: string;
    entityType: CommentEntityType;
    entityId: string;
    mentionedUserIds: string[];
    mentionedByUserId: string;
  }): Promise<void> {
    const {
      organizationId,
      commentId,
      commentContent,
      entityType,
      entityId,
      mentionedUserIds,
      mentionedByUserId,
    } = params;

    if (!mentionedUserIds || mentionedUserIds.length === 0) {
      return;
    }

    // Only send notifications for task comments
    if (entityType !== CommentEntityType.task) {
      this.logger.log(
        `Skipping comment mention notifications: only task comments are supported (entityType: ${entityType})`,
      );
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

      // Get entity name for context (only for task comments)
      const taskItem = await db.taskItem.findUnique({
        where: { id: entityId },
        select: { title: true, entityType: true, entityId: true },
      });
      const entityName = taskItem?.title || 'Unknown Task';
      // For task comments, we need to get the parent entity route
      let entityRoutePath = '';
      if (taskItem?.entityType === 'risk') {
        entityRoutePath = 'risks';
      } else if (taskItem?.entityType === 'vendor') {
        entityRoutePath = 'vendors';
      }

      // Build comment URL (only for task comments)
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      
      // For task comments, link to the task item's parent entity
      const parentRoutePath = taskItem?.entityType === 'vendor' ? 'vendors' : 'risk';
      const commentUrl = taskItem
        ? `${appUrl}/${organizationId}/${parentRoutePath}/${taskItem.entityId}?taskItemId=${entityId}#task-items`
        : '';

      const mentionedByName =
        mentionedByUser.name || mentionedByUser.email || 'Someone';

      this.logger.log(
        `Sending comment mention notifications to ${mentionedUsers.length} users for comment ${commentId}`,
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

        // Check if user is unsubscribed from comment mention notifications
        // Note: We'll use 'taskMentions' preference for now, or create a new 'commentMentions' preference
        const isUnsubscribed = await isUserUnsubscribed(db, user.email, 'taskMentions');
        if (isUnsubscribed) {
          this.logger.log(
            `Skipping mention notification: user ${user.email} is unsubscribed from mentions`,
          );
          continue;
        }

        const userName = user.name || user.email || 'User';

        // Send email notification via Resend
        try {
          const { id } = await sendEmail({
            to: user.email,
            subject: `${mentionedByName} mentioned you in a comment`,
            react: CommentMentionedEmail({
              toName: userName,
              toEmail: user.email,
              commentContent,
              mentionedByName,
              entityName,
              entityRoutePath,
              entityId,
              organizationId,
              commentUrl,
            }),
            system: true,
          });

          this.logger.log(
            `Comment mention email sent to ${user.email} (ID: ${id})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send comment mention email to ${user.email}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
          // Continue with other users even if one fails
        }

        // Send in-app notification via Novu
        this.logger.log(
          `[NOVU] Attempting to send in-app notification to ${user.id} (subscriber: ${user.id}-${organizationId}) for comment ${commentId}`,
        );
        try {
          await this.novuService.trigger({
            workflowId: 'comment-mentioned',
            subscriberId: `${user.id}-${organizationId}`,
            email: user.email,
            payload: {
              commentContent,
              mentionedByName,
              entityName,
              entityRoutePath,
              entityId,
              organizationId,
              commentUrl,
            },
          });

          this.logger.log(
            `[NOVU] Comment mention in-app notification sent to ${user.id}`,
          );
        } catch (error) {
          this.logger.error(
            `[NOVU] Failed to send comment mention in-app notification to ${user.id}:`,
            error instanceof Error ? error.message : 'Unknown error',
          );
          // Continue with other users even if one fails
        }
      }

      this.logger.log(
        `Sent comment mention notifications for comment ${commentId} to ${mentionedUsers.length} users`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send comment mention notifications for comment ${commentId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Don't throw - notification failures should not block comment operations
    }
  }
}


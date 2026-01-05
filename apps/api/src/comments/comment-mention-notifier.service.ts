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

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    'https://app.trycomp.ai'
  );
}

function getAllowedOrigins(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    'https://app.trycomp.ai',
  ].filter(Boolean) as string[];

  const origins = new Set<string>();
  for (const candidate of candidates) {
    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // ignore invalid env values
    }
  }

  return [...origins];
}

function tryNormalizeContextUrl(params: {
  organizationId: string;
  contextUrl?: string;
}): string | null {
  const { organizationId, contextUrl } = params;
  if (!contextUrl) return null;

  try {
    const url = new URL(contextUrl);
    const allowedOrigins = new Set(getAllowedOrigins());
    if (!allowedOrigins.has(url.origin)) return null;

    // Ensure the URL is for the same org so we don't accidentally deep-link elsewhere.
    // Use startsWith to prevent path traversal attacks (e.g., /attacker_org/victim_org/)
    if (!url.pathname.startsWith(`/${organizationId}/`)) return null;

    return url.toString();
  } catch {
    return null;
  }
}

async function buildFallbackCommentContext(params: {
  organizationId: string;
  entityType: CommentEntityType;
  entityId: string;
}): Promise<{
  entityName: string;
  entityRoutePath: string;
  commentUrl: string;
} | null> {
  const { organizationId, entityType, entityId } = params;
  const appUrl = getAppBaseUrl();

  if (entityType === CommentEntityType.task) {
    // CommentEntityType.task can be:
    // - TaskItem id (preferred)
    // - Task id (legacy)
    // Use findFirst with organizationId to ensure entity belongs to correct org
    const taskItem = await db.taskItem.findFirst({
      where: { id: entityId, organizationId },
      select: { title: true, entityType: true, entityId: true },
    });

    if (taskItem) {
      const parentRoutePath = taskItem.entityType === 'vendor' ? 'vendors' : 'risk';
      const url = new URL(
        `${appUrl}/${organizationId}/${parentRoutePath}/${taskItem.entityId}`,
      );
      url.searchParams.set('taskItemId', entityId);
      url.hash = 'task-items';

      return {
        entityName: taskItem.title || 'Task',
        entityRoutePath: parentRoutePath,
        commentUrl: url.toString(),
      };
    }

    const task = await db.task.findFirst({
      where: { id: entityId, organizationId },
      select: { title: true },
    });

    if (!task) {
      // Entity not found in this organization - do not send notification
      return null;
    }

    const url = new URL(`${appUrl}/${organizationId}/tasks/${entityId}`);

    return {
      entityName: task.title || 'Task',
      entityRoutePath: 'tasks',
      commentUrl: url.toString(),
    };
  }

  if (entityType === CommentEntityType.vendor) {
    const vendor = await db.vendor.findFirst({
      where: { id: entityId, organizationId },
      select: { name: true },
    });

    if (!vendor) {
      return null;
    }

    const url = new URL(`${appUrl}/${organizationId}/vendors/${entityId}`);

    return {
      entityName: vendor.name || 'Vendor',
      entityRoutePath: 'vendors',
      commentUrl: url.toString(),
    };
  }

  if (entityType === CommentEntityType.risk) {
    const risk = await db.risk.findFirst({
      where: { id: entityId, organizationId },
      select: { title: true },
    });

    if (!risk) {
      return null;
    }

    const url = new URL(`${appUrl}/${organizationId}/risk/${entityId}`);

    return {
      entityName: risk.title || 'Risk',
      entityRoutePath: 'risk',
      commentUrl: url.toString(),
    };
  }

  // CommentEntityType.policy
  const policy = await db.policy.findFirst({
    where: { id: entityId, organizationId },
    select: { name: true },
  });

  if (!policy) {
    return null;
  }

  const url = new URL(`${appUrl}/${organizationId}/policies/${entityId}`);

  return {
    entityName: policy.name || 'Policy',
    entityRoutePath: 'policies',
    commentUrl: url.toString(),
  };
}

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
    contextUrl?: string;
    mentionedUserIds: string[];
    mentionedByUserId: string;
  }): Promise<void> {
    const {
      organizationId,
      commentId,
      commentContent,
      entityType,
      entityId,
      contextUrl,
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

      const normalizedContextUrl = tryNormalizeContextUrl({
        organizationId,
        contextUrl,
      });
      const fallback = await buildFallbackCommentContext({
        organizationId,
        entityType,
        entityId,
      });

      // If entity not found in this organization, skip notifications for security
      if (!fallback) {
        this.logger.warn(
          `Skipping comment mention notifications: entity ${entityId} (${entityType}) not found in organization ${organizationId}`,
        );
        return;
      }

      const entityName = fallback.entityName;
      const entityRoutePath = fallback.entityRoutePath;
      const commentUrl = normalizedContextUrl ?? fallback.commentUrl;

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


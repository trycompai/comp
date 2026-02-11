import { AttachmentEntityType, CommentEntityType } from '@db';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { db } from '@trycompai/db/server';
import { AttachmentsService } from '../attachments/attachments.service';
import {
  AttachmentResponseDto,
  CommentResponseDto,
} from './dto/comment-responses.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentMentionNotifierService } from './comment-mention-notifier.service';

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

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly mentionNotifier: CommentMentionNotifierService,
  ) {}

  /**
   * Validate that the target entity exists and belongs to the organization
   */
  private async validateEntityAccess(
    organizationId: string,
    entityId: string,
    entityType: CommentEntityType,
  ): Promise<void> {
    let entityExists = false;

    switch (entityType) {
      case CommentEntityType.task: {
        // Backward compatible:
        // - TaskItem detail view uses CommentEntityType.task with a TaskItem id
        // - Legacy compliance "Task" pages also use CommentEntityType.task with a Task id
        //
        // Prefer TaskItem lookup first, then fall back to Task.
        const taskItem = await db.taskItem.findFirst({
          where: { id: entityId, organizationId },
        });
        if (taskItem) {
          entityExists = true;
          break;
        }

        const task = await db.task.findFirst({
          where: { id: entityId, organizationId },
        });
        entityExists = !!task;
        break;
      }

      case CommentEntityType.policy: {
        const policy = await db.policy.findFirst({
          where: { id: entityId, organizationId },
        });
        entityExists = !!policy;
        break;
      }

      case CommentEntityType.vendor: {
        const vendor = await db.vendor.findFirst({
          where: { id: entityId, organizationId },
        });
        entityExists = !!vendor;
        if (!entityExists) {
          // Check if vendor exists in a different org for better error message
          const vendorInOtherOrg = await db.vendor.findFirst({
            where: { id: entityId },
            select: { organizationId: true },
          });
          if (vendorInOtherOrg) {
            this.logger.warn('Vendor exists but in different organization', {
              entityId,
              requestedOrgId: organizationId,
              actualOrgId: vendorInOtherOrg.organizationId,
            });
          } else {
            this.logger.warn('Vendor not found', { entityId, organizationId });
          }
        }
        break;
      }

      case CommentEntityType.risk: {
        const risk = await db.risk.findFirst({
          where: { id: entityId, organizationId },
        });
        entityExists = !!risk;
        break;
      }

      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }

    if (!entityExists) {
      throw new BadRequestException(
        `${entityType} with id ${entityId} not found in organization ${organizationId} or access denied`,
      );
    }
  }

  /**
   * Get all comments for an entity
   */
  async getComments(
    organizationId: string,
    entityId: string,
    entityType: CommentEntityType,
  ): Promise<CommentResponseDto[]> {
    try {
      // Validate entity access
      await this.validateEntityAccess(organizationId, entityId, entityType);

      const comments = await db.comment.findMany({
        where: {
          organizationId,
          entityId,
          entityType,
        },
        include: {
          author: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Get attachment metadata for each comment (WITHOUT signed URLs for on-demand generation)
      const commentsWithAttachments = await Promise.all(
        comments.map(async (comment) => {
          const attachments =
            await this.attachmentsService.getAttachmentMetadata(
              organizationId,
              comment.id,
              AttachmentEntityType.comment,
            );

          return {
            id: comment.id,
            content: comment.content,
            author: {
              id: comment.author.user.id,
              name: comment.author.user.name,
              email: comment.author.user.email,
              image: comment.author.user.image,
              deactivated: comment.author.deactivated,
            },
            attachments,
            createdAt: comment.createdAt,
          };
        }),
      );

      return commentsWithAttachments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch comments');
    }
  }

  /**
   * Create a new comment with optional attachments
   */
  async createComment(
    organizationId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    try {
      // Validate entity access
      await this.validateEntityAccess(
        organizationId,
        createCommentDto.entityId,
        createCommentDto.entityType,
      );

      // Get user and member info
      const member = await db.member.findFirst({
        where: {
          userId,
          organizationId,
          deactivated: false,
        },
        include: {
          user: true,
        },
      });

      if (!member) {
        throw new BadRequestException(
          'User is not a member of this organization',
        );
      }

      // Use transaction to ensure data consistency
      const result = await db.$transaction(async (tx) => {
        // Create comment
        const comment = await tx.comment.create({
          data: {
            content: createCommentDto.content,
            entityId: createCommentDto.entityId,
            entityType: createCommentDto.entityType,
            organizationId,
            authorId: member.id,
          },
        });

        // Upload attachments if provided
        const attachments: AttachmentResponseDto[] = [];
        if (
          createCommentDto.attachments &&
          createCommentDto.attachments.length > 0
        ) {
          for (const attachmentDto of createCommentDto.attachments) {
            const attachment = await this.attachmentsService.uploadAttachment(
              organizationId,
              comment.id,
              AttachmentEntityType.comment,
              attachmentDto,
              userId,
            );
            attachments.push(attachment);
          }
        }

        return {
          comment,
          attachments,
        };
      });

      // Notify mentioned users
      if (createCommentDto.content && userId) {
        const mentionedUserIds = extractMentionedUserIds(
          createCommentDto.content,
        );
        if (mentionedUserIds.length > 0) {
          // Fire-and-forget: notification failures should not block comment creation
          void this.mentionNotifier.notifyMentionedUsers({
            organizationId,
            commentId: result.comment.id,
            commentContent: createCommentDto.content,
            entityType: createCommentDto.entityType,
            entityId: createCommentDto.entityId,
            contextUrl: createCommentDto.contextUrl,
            mentionedUserIds,
            mentionedByUserId: userId,
          });
        }
      }

      return {
        id: result.comment.id,
        content: result.comment.content,
        author: {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          image: member.user.image,
          deactivated: member.deactivated,
        },
        attachments: result.attachments,
        createdAt: result.comment.createdAt,
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create comment');
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    organizationId: string,
    commentId: string,
    userId: string,
    content: string,
    contextUrl?: string,
  ): Promise<CommentResponseDto> {
    try {
      // Get comment and verify ownership/permissions
      const existingComment = await db.comment.findFirst({
        where: {
          id: commentId,
          organizationId,
        },
        include: {
          author: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!existingComment) {
        throw new BadRequestException('Comment not found or access denied');
      }

      // Verify user is the author or has admin privileges
      if (existingComment.author.userId !== userId) {
        throw new BadRequestException('You can only edit your own comments');
      }

      // Update comment
      const updatedComment = await db.comment.update({
        where: {
          id: commentId,
          organizationId,
        },
        data: {
          content,
        },
      });

      // Get attachments
      const attachments = await this.attachmentsService.getAttachments(
        organizationId,
        commentId,
        AttachmentEntityType.comment,
      );

      // Notify only newly mentioned users on update (avoid re-notifying on typo edits)
      if (content && userId) {
        const previousMentioned = new Set(
          extractMentionedUserIds(existingComment.content),
        );
        const currentMentioned = extractMentionedUserIds(content);

        const newlyMentionedUserIds = currentMentioned.filter(
          (id) => !previousMentioned.has(id),
        );

        if (newlyMentionedUserIds.length > 0) {
          // Fire-and-forget: notification failures should not block comment update
          void this.mentionNotifier.notifyMentionedUsers({
            organizationId,
            commentId: updatedComment.id,
            commentContent: content,
            entityType: existingComment.entityType,
            entityId: existingComment.entityId,
            contextUrl,
            mentionedUserIds: newlyMentionedUserIds,
            mentionedByUserId: userId,
          });
        }
      }

      return {
        id: updatedComment.id,
        content: updatedComment.content,
        author: {
          id: existingComment.author.user.id,
          name: existingComment.author.user.name,
          email: existingComment.author.user.email,
          image: existingComment.author.user.image,
          deactivated: existingComment.author.deactivated,
        },
        attachments,
        createdAt: updatedComment.createdAt,
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update comment');
    }
  }

  /**
   * Delete a comment and its attachments
   */
  async deleteComment(
    organizationId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Get comment and verify ownership/permissions
      const existingComment = await db.comment.findFirst({
        where: {
          id: commentId,
          organizationId,
        },
        include: {
          author: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!existingComment) {
        throw new BadRequestException('Comment not found or access denied');
      }

      // Verify user is the author or has admin privileges
      if (existingComment.author.userId !== userId) {
        throw new BadRequestException('You can only delete your own comments');
      }

      // Use transaction to ensure data consistency
      await db.$transaction(async (tx) => {
        // Get all attachments for this comment
        const attachments = await tx.attachment.findMany({
          where: {
            organizationId,
            entityId: commentId,
            entityType: AttachmentEntityType.comment,
          },
        });

        // Delete attachments from S3 and database
        for (const attachment of attachments) {
          await this.attachmentsService.deleteAttachment(
            organizationId,
            attachment.id,
          );
        }

        // Delete the comment
        await tx.comment.delete({
          where: {
            id: commentId,
            organizationId,
          },
        });
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete comment');
    }
  }
}

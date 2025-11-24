import { AttachmentEntityType, CommentEntityType } from '@db';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { AttachmentsService } from '../attachments/attachments.service';
import {
  AttachmentResponseDto,
  CommentResponseDto,
} from './dto/comment-responses.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly attachmentsService: AttachmentsService) {}

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
      throw new BadRequestException(`${entityType} not found or access denied`);
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

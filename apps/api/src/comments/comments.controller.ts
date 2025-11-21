import { CommentEntityType } from '@/lib/db';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CommentsService } from './comments.service';
import { CommentResponseDto } from './dto/comment-responses.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@Controller({ path: 'comments', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get comments for an entity',
    description:
      'Retrieve all comments for a specific entity (task, policy, vendor, etc.)',
  })
  @ApiQuery({
    name: 'entityId',
    description: 'ID of the entity to get comments for',
    example: 'tsk_abc123def456',
  })
  @ApiQuery({
    name: 'entityType',
    description: 'Type of entity',
    enum: CommentEntityType,
    example: 'task',
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [CommentResponseDto],
  })
  async getComments(
    @OrganizationId() organizationId: string,
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: CommentEntityType,
  ): Promise<CommentResponseDto[]> {
    return await this.commentsService.getComments(
      organizationId,
      entityId,
      entityType,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new comment',
    description: 'Create a comment on an entity with optional file attachments',
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  async createComment(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() createCommentDto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    return await this.commentsService.createComment(
      organizationId,
      authContext.userId,
      createCommentDto,
    );
  }

  @Put(':commentId')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Update the content of an existing comment (author only)',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Unique comment identifier',
    example: 'cmt_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  async updateComment(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    return await this.commentsService.updateComment(
      organizationId,
      commentId,
      authContext.userId,
      updateCommentDto.content,
    );
  }

  @Delete(':commentId')
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Delete a comment and all its attachments (author only)',
  })
  @ApiParam({
    name: 'commentId',
    description: 'Unique comment identifier',
    example: 'cmt_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            deletedCommentId: { type: 'string', example: 'cmt_abc123def456' },
            message: {
              type: 'string',
              example: 'Comment deleted successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid authentication',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { message: { type: 'string', example: 'Unauthorized' } },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Comment with ID cmt_abc123def456 not found',
            },
          },
        },
      },
    },
  })
  async deleteComment(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('commentId') commentId: string,
  ): Promise<{ success: boolean; deletedCommentId: string; message: string }> {
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required');
    }

    await this.commentsService.deleteComment(
      organizationId,
      commentId,
      authContext.userId,
    );

    return {
      success: true,
      deletedCommentId: commentId,
      message: 'Comment deleted successfully',
    };
  }
}

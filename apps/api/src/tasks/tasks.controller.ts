import { AttachmentEntityType } from '@db';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AttachmentsService } from '../attachments/attachments.service';
import { UploadAttachmentDto } from '../attachments/upload-attachment.dto';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import {
  AttachmentResponseDto,
  TaskResponseDto,
} from './dto/task-responses.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiExtraModels(TaskResponseDto, AttachmentResponseDto)
@Controller({ path: 'tasks', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  // ==================== TASKS ====================

  @Get()
  @ApiOperation({
    summary: 'Get all tasks',
    description: 'Retrieve all tasks for the authenticated organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: '#/components/schemas/TaskResponseDto' },
        },
        example: [
          {
            id: 'tsk_abc123def456',
            title: 'Implement user authentication',
            description: 'Add OAuth 2.0 authentication to the platform',
            status: 'in_progress',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
          },
        ],
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
  async getTasks(
    @OrganizationId() organizationId: string,
  ): Promise<TaskResponseDto[]> {
    return await this.tasksService.getTasks(organizationId);
  }

  @Get(':taskId')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Retrieve a specific task by its ID',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/TaskResponseDto' },
        example: {
          id: 'tsk_abc123def456',
          title: 'Implement user authentication',
          description: 'Add OAuth 2.0 authentication to the platform',
          status: 'in_progress',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Task with ID tsk_abc123def456 not found',
            },
          },
        },
      },
    },
  })
  async getTask(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ): Promise<TaskResponseDto> {
    return await this.tasksService.getTask(organizationId, taskId);
  }

  // ==================== TASK ATTACHMENTS ====================

  @Get(':taskId/attachments')
  @ApiOperation({
    summary: 'Get task attachments',
    description: 'Retrieve all attachments for a specific task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachments retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: '#/components/schemas/AttachmentResponseDto' },
        },
        example: [
          {
            id: 'att_abc123def456',
            name: 'evidence.pdf',
            type: 'application/pdf',
            size: 123456,
            downloadUrl:
              'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
            createdAt: '2024-01-15T10:30:00Z',
          },
        ],
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
    description: 'Task not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Task with ID tsk_abc123def456 not found',
            },
          },
        },
      },
    },
  })
  async getTaskAttachments(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ): Promise<AttachmentResponseDto[]> {
    // Verify task access
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return await this.attachmentsService.getAttachments(
      organizationId,
      taskId,
      AttachmentEntityType.task,
    );
  }

  @Post(':taskId/attachments')
  @ApiOperation({
    summary: 'Upload attachment to task',
    description: 'Upload a file attachment to a specific task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AttachmentResponseDto' },
        example: {
          id: 'att_abc123def456',
          entityId: 'tsk_abc123def456',
          entityType: 'task',
          fileName: 'evidence.pdf',
          fileType: 'application/pdf',
          fileSize: 123456,
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'usr_abc123def456',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file data or file too large',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'File exceeds maximum allowed size',
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
    description: 'Task not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Task with ID tsk_abc123def456 not found',
            },
          },
        },
      },
    },
  })
  async uploadTaskAttachment(
    @AuthContext() authContext: AuthContextType,
    @Param('taskId') taskId: string,
    @Body() uploadDto: UploadAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    // Verify task access
    await this.tasksService.verifyTaskAccess(
      authContext.organizationId,
      taskId,
    );

    // For API key auth, userId must be provided in the request body
    // For JWT auth, userId comes from the authenticated session
    let userId: string;
    if (authContext.isApiKey) {
      // For API key auth, userId must be provided in the DTO
      if (!uploadDto.userId) {
        throw new BadRequestException(
          'User ID is required when using API key authentication. Provide userId in the request body.',
        );
      }
      userId = uploadDto.userId;
    } else {
      // For JWT auth, use the authenticated user's ID
      if (!authContext.userId) {
        throw new BadRequestException('User ID is required');
      }
      userId = authContext.userId;
    }

    return await this.attachmentsService.uploadAttachment(
      authContext.organizationId,
      taskId,
      AttachmentEntityType.task,
      uploadDto,
      userId,
    );
  }

  @Get(':taskId/attachments/:attachmentId/download')
  @ApiOperation({
    summary: 'Get attachment download URL',
    description: 'Generate a signed URL for downloading a task attachment',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Unique attachment identifier',
    example: 'att_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            downloadUrl: {
              type: 'string',
              description: 'Signed URL for downloading the file',
              example:
                'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
            },
            expiresIn: {
              type: 'number',
              description: 'URL expiration time in seconds',
              example: 900,
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
    description: 'Task or attachment not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Task or attachment not found',
            },
          },
        },
      },
    },
  })
  async getTaskAttachmentDownloadUrl(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    // Verify task access
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return await this.attachmentsService.getAttachmentDownloadUrl(
      organizationId,
      attachmentId,
    );
  }

  @Delete(':taskId/attachments/:attachmentId')
  @ApiOperation({
    summary: 'Delete task attachment',
    description: 'Delete a specific attachment from a task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Unique attachment identifier',
    example: 'att_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Attachment deleted successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            deletedAttachmentId: {
              type: 'string',
              example: 'att_abc123def456',
            },
            message: {
              type: 'string',
              example: 'Attachment deleted successfully',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Task or attachment not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Task or attachment not found',
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
  async deleteTaskAttachment(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<{
    success: boolean;
    deletedAttachmentId: string;
    message: string;
  }> {
    // Verify task access
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    await this.attachmentsService.deleteAttachment(
      organizationId,
      attachmentId,
    );

    return {
      success: true,
      deletedAttachmentId: attachmentId,
      message: 'Attachment deleted successfully',
    };
  }
}

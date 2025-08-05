import { AttachmentEntityType } from '@db';
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
  UseGuards,
} from '@nestjs/common';
import {
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
    type: [TaskResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid authentication',
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
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
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
    type: [AttachmentResponseDto],
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
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file data or file too large',
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

    // Ensure userId is present for attachment upload
    if (!authContext.userId) {
      throw new BadRequestException('User ID is required for file upload');
    }

    return await this.attachmentsService.uploadAttachment(
      authContext.organizationId,
      taskId,
      AttachmentEntityType.task,
      uploadDto,
      authContext.userId,
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
  @HttpCode(HttpStatus.NO_CONTENT)
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
    status: 204,
    description: 'Attachment deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task or attachment not found',
  })
  async deleteTaskAttachment(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<void> {
    // Verify task access
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    await this.attachmentsService.deleteAttachment(
      organizationId,
      attachmentId,
    );
  }
}

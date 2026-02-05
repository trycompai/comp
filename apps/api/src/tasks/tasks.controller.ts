import { AttachmentEntityType } from '@db';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { TaskStatus } from '@db';
import { AttachmentsService } from '../attachments/attachments.service';
import { UploadAttachmentDto } from '../attachments/upload-attachment.dto';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import {
  buildTaskAssignmentFilter,
  hasTaskAccess,
} from '../utils/assignment-filter';
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
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  // ==================== TASKS ====================

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'read')
  @ApiOperation({
    summary: 'Get all tasks',
    description:
      'Retrieve all tasks for the authenticated organization. Employees/contractors only see their assigned tasks.',
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
    @AuthContext() authContext: AuthContextType,
  ): Promise<TaskResponseDto[]> {
    // Build assignment filter for restricted roles (employee/contractor)
    const assignmentFilter = buildTaskAssignmentFilter(
      authContext.memberId,
      authContext.userRoles,
    );

    return await this.tasksService.getTasks(organizationId, assignmentFilter);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'create')
  @ApiOperation({
    summary: 'Create a task',
    description: 'Create a new task for the organization',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Implement access controls' },
        description: {
          type: 'string',
          example: 'Set up role-based access controls for the platform',
        },
        assigneeId: {
          type: 'string',
          nullable: true,
          example: 'mem_abc123',
        },
        frequency: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
          nullable: true,
          example: 'monthly',
        },
        department: {
          type: 'string',
          enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
          nullable: true,
          example: 'it',
        },
        controlIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['ctrl_abc123'],
        },
        taskTemplateId: {
          type: 'string',
          nullable: true,
          example: 'tmpl_abc123',
        },
        vendorId: {
          type: 'string',
          nullable: true,
          example: 'vnd_abc123',
          description: 'Vendor ID to connect this task to',
        },
      },
      required: ['title', 'description'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/TaskResponseDto' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  async createTask(
    @OrganizationId() organizationId: string,
    @Body()
    body: {
      title: string;
      description: string;
      assigneeId?: string | null;
      frequency?: string | null;
      department?: string | null;
      controlIds?: string[];
      taskTemplateId?: string | null;
      vendorId?: string | null;
    },
  ): Promise<TaskResponseDto> {
    if (!body.title || !body.description) {
      throw new BadRequestException('title and description are required');
    }

    return await this.tasksService.createTask(organizationId, body);
  }

  @Patch('bulk')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Update status for multiple tasks',
    description: 'Bulk update the status of multiple tasks',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['tsk_abc123', 'tsk_def456'],
        },
        status: {
          type: 'string',
          enum: Object.values(TaskStatus),
          example: TaskStatus.in_progress,
        },
        reviewDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-01T00:00:00.000Z',
          description: 'Optional review date to set on all tasks',
        },
      },
      required: ['taskIds', 'status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks updated successfully',
    schema: {
      type: 'object',
      properties: {
        updatedCount: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  async updateTasksStatus(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body()
    body: {
      taskIds: string[];
      status: TaskStatus;
      reviewDate?: string;
    },
  ): Promise<{ updatedCount: number }> {
    const { taskIds, status, reviewDate } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new BadRequestException('taskIds must be a non-empty array');
    }

    if (!Object.values(TaskStatus).includes(status)) {
      throw new BadRequestException('status is invalid');
    }

    let parsedReviewDate: Date | undefined;
    if (reviewDate !== undefined) {
      if (reviewDate === null || typeof reviewDate !== 'string') {
        throw new BadRequestException('reviewDate is invalid');
      }
      parsedReviewDate = new Date(reviewDate);
      if (Number.isNaN(parsedReviewDate.getTime())) {
        throw new BadRequestException('reviewDate is invalid');
      }
    }

    // Get userId from auth context
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. Bulk operations require authenticated user session.',
      );
    }
    const userId = authContext.userId;

    return await this.tasksService.updateTasksStatus(
      organizationId,
      taskIds,
      status,
      parsedReviewDate,
      userId,
    );
  }

  @Patch('bulk/assignee')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'assign')
  @ApiOperation({
    summary: 'Update assignee for multiple tasks',
    description: 'Bulk update the assignee of multiple tasks',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['tsk_abc123', 'tsk_def456'],
        },
        assigneeId: {
          type: 'string',
          nullable: true,
          example: 'mem_abc123',
          description: 'Assignee member ID, or null to unassign',
        },
      },
      required: ['taskIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks updated successfully',
    schema: {
      type: 'object',
      properties: {
        updatedCount: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  async updateTasksAssignee(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body()
    body: {
      taskIds: string[];
      assigneeId: string | null;
    },
  ): Promise<{ updatedCount: number }> {
    const { taskIds, assigneeId } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new BadRequestException('taskIds must be a non-empty array');
    }

    // Get userId from auth context
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. Bulk operations require authenticated user session.',
      );
    }
    const userId = authContext.userId;

    return await this.tasksService.updateTasksAssignee(
      organizationId,
      taskIds,
      assigneeId ?? null,
      userId,
    );
  }

  @Patch('reorder')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Reorder tasks',
    description: 'Update the order and status for multiple tasks (drag & drop)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              order: { type: 'number' },
              status: { type: 'string', enum: Object.values(TaskStatus) },
            },
            required: ['id', 'order', 'status'],
          },
        },
      },
      required: ['updates'],
    },
  })
  @ApiResponse({ status: 200, description: 'Tasks reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async reorderTasks(
    @OrganizationId() organizationId: string,
    @Body() body: { updates: { id: string; order: number; status: TaskStatus }[] },
  ): Promise<{ success: boolean }> {
    if (!Array.isArray(body.updates) || body.updates.length === 0) {
      throw new BadRequestException('updates must be a non-empty array');
    }
    await this.tasksService.reorderTasks(organizationId, body.updates);
    return { success: true };
  }

  @Delete('bulk')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'delete')
  @ApiOperation({
    summary: 'Delete multiple tasks',
    description: 'Bulk delete multiple tasks by their IDs',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        taskIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['tsk_abc123', 'tsk_def456'],
        },
      },
      required: ['taskIds'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  async deleteTasks(
    @OrganizationId() organizationId: string,
    @Body()
    body: {
      taskIds: string[];
    },
  ): Promise<{ deletedCount: number }> {
    const { taskIds } = body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new BadRequestException('taskIds must be a non-empty array');
    }

    return await this.tasksService.deleteTasks(organizationId, taskIds);
  }

  @Get(':taskId')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'read')
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
    status: 403,
    description: 'Forbidden - Not assigned to this task',
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
    @AuthContext() authContext: AuthContextType,
  ): Promise<TaskResponseDto> {
    // Service returns full task object with assignee info
    const task = await this.tasksService.getTask(organizationId, taskId);

    // Check assignment access for restricted roles
    // The task object from service includes assigneeId even though DTO doesn't declare it
    const taskWithAssignee = task as TaskResponseDto & { assigneeId: string | null };
    if (
      !hasTaskAccess(taskWithAssignee, authContext.memberId, authContext.userRoles)
    ) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return task;
  }

  @Patch(':taskId')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Update an existing task (title, description, status, assignee, frequency, department, reviewDate)',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          example: 'Review access controls',
          description: 'Task title',
        },
        description: {
          type: 'string',
          example: 'Review and update access control policies',
          description: 'Task description',
        },
        status: {
          type: 'string',
          enum: Object.values(TaskStatus),
          example: TaskStatus.in_progress,
        },
        assigneeId: {
          type: 'string',
          nullable: true,
          example: 'mem_abc123',
          description: 'Assignee member ID, or null to unassign',
        },
        frequency: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
          example: 'monthly',
        },
        department: {
          type: 'string',
          enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
          example: 'it',
        },
        reviewDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/TaskResponseDto' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or task not found',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async updateTask(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('taskId') taskId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      assigneeId?: string | null;
      frequency?: string;
      department?: string;
      reviewDate?: string;
    },
  ): Promise<TaskResponseDto> {
    // Get userId from auth context
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. Task updates require authenticated user session.',
      );
    }
    const userId = authContext.userId;

    let parsedReviewDate: Date | null | undefined;
    if (body.reviewDate !== undefined) {
      if (body.reviewDate === null) {
        // null means clear the reviewDate
        parsedReviewDate = null;
      } else if (typeof body.reviewDate !== 'string') {
        throw new BadRequestException('reviewDate is invalid');
      } else {
        parsedReviewDate = new Date(body.reviewDate);
        if (Number.isNaN(parsedReviewDate.getTime())) {
          throw new BadRequestException('reviewDate is invalid');
        }
      }
    }

    return await this.tasksService.updateTask(
      organizationId,
      taskId,
      {
        title: body.title,
        description: body.description,
        status: body.status,
        assigneeId: body.assigneeId,
        frequency: body.frequency,
        department: body.department,
        reviewDate: parsedReviewDate,
      },
      userId,
    );
  }

  @Post(':taskId/regenerate')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Regenerate task from template',
    description:
      'Update the task title, description, and automation status with the latest content from the framework template',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({ status: 200, description: 'Task regenerated successfully' })
  @ApiResponse({ status: 400, description: 'Task has no associated template' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async regenerateTask(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.regenerateFromTemplate(organizationId, taskId);
  }

  @Delete(':taskId')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'delete')
  @ApiOperation({
    summary: 'Delete a task',
    description: 'Delete a single task by its ID',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Task deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async deleteTask(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.tasksService.deleteTask(organizationId, taskId);
    return { success: true, message: 'Task deleted successfully' };
  }

  // ==================== TASK ATTACHMENTS ====================

  @Get(':taskId/attachments')
  @UseGuards(PermissionGuard)
  @RequirePermission('task', 'read')
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
  @UseGuards(PermissionGuard)
  @RequirePermission('evidence', 'upload')
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
  @UseGuards(PermissionGuard)
  @RequirePermission('evidence', 'read')
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
  @UseGuards(PermissionGuard)
  @RequirePermission('evidence', 'delete')
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

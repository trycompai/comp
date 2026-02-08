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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiBody,
  ApiHeader,
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

  @Patch('bulk')
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

  @Post('bulk/submit-for-review')
  @ApiOperation({
    summary: 'Bulk submit tasks for review',
    description: 'Submit multiple tasks for review with a single approver',
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
        approverId: {
          type: 'string',
          example: 'mem_abc123',
          description: 'Member ID of the approver',
        },
      },
      required: ['taskIds', 'approverId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Tasks submitted for review' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async bulkSubmitForReview(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: { taskIds: string[]; approverId: string },
  ): Promise<{ submittedCount: number }> {
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. Bulk operations require authenticated user session.',
      );
    }
    if (!Array.isArray(body.taskIds) || body.taskIds.length === 0) {
      throw new BadRequestException('taskIds must be a non-empty array');
    }
    if (!body.approverId) {
      throw new BadRequestException('approverId is required');
    }
    return await this.tasksService.bulkSubmitForReview(
      organizationId,
      body.taskIds,
      authContext.userId,
      body.approverId,
    );
  }

  @Delete('bulk')
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

  @Get(':taskId/activity')
  @ApiOperation({
    summary: 'Get task activity',
    description: 'Retrieve audit log activity for a specific task with pagination',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({ status: 200, description: 'Activity retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Task not found' })
  async getTaskActivity(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const parsedSkip = skip ? Math.max(0, parseInt(skip, 10) || 0) : 0;
    const parsedTake = take ? Math.min(50, Math.max(1, parseInt(take, 10) || 10)) : 10;
    return await this.tasksService.getTaskActivity(organizationId, taskId, parsedSkip, parsedTake);
  }

  @Patch(':taskId')
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Update an existing task (status, assignee, approver, frequency, department, reviewDate)',
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
        approverId: {
          type: 'string',
          nullable: true,
          example: 'mem_abc123',
          description: 'Approver member ID, or null to unassign',
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
      status?: TaskStatus;
      assigneeId?: string | null;
      approverId?: string | null;
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
        status: body.status,
        assigneeId: body.assigneeId,
        approverId: body.approverId,
        frequency: body.frequency,
        department: body.department,
        reviewDate: parsedReviewDate,
      },
      userId,
    );
  }

  // ==================== TASK APPROVAL ====================

  @Post(':taskId/submit-for-review')
  @ApiOperation({
    summary: 'Submit task for review',
    description:
      'Move task status to in_review and assign an approver.',
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
        approverId: {
          type: 'string',
          example: 'mem_abc123',
          description: 'Member ID of the approver',
        },
      },
      required: ['approverId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Task submitted for review' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async submitForReview(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('taskId') taskId: string,
    @Body() body: { approverId: string },
  ): Promise<TaskResponseDto> {
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. This operation requires an authenticated user session.',
      );
    }
    if (!body.approverId) {
      throw new BadRequestException('approverId is required');
    }
    return await this.tasksService.submitForReview(
      organizationId,
      taskId,
      authContext.userId,
      body.approverId,
    );
  }

  @Post(':taskId/approve')
  @ApiOperation({
    summary: 'Approve a task',
    description:
      'Approve a task that is in review. Only the assigned approver can approve. Moves status to done and creates an audit comment.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({ status: 200, description: 'Task approved successfully' })
  @ApiResponse({ status: 400, description: 'Task is not in review' })
  @ApiResponse({ status: 403, description: 'Not the assigned approver' })
  async approveTask(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('taskId') taskId: string,
  ): Promise<TaskResponseDto> {
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. This operation requires an authenticated user session.',
      );
    }
    return await this.tasksService.approveTask(
      organizationId,
      taskId,
      authContext.userId,
    );
  }

  @Post(':taskId/reject')
  @ApiOperation({
    summary: 'Reject a task review',
    description:
      'Reject a task that is in review. Only the assigned approver can reject. Reverts status to the previous status and creates an audit comment.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({ status: 200, description: 'Task rejected successfully' })
  @ApiResponse({ status: 400, description: 'Task is not in review' })
  @ApiResponse({ status: 403, description: 'Not the assigned approver' })
  async rejectTask(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('taskId') taskId: string,
  ): Promise<TaskResponseDto> {
    if (!authContext.userId) {
      throw new BadRequestException(
        'User ID is required. This operation requires an authenticated user session.',
      );
    }
    return await this.tasksService.rejectTask(
      organizationId,
      taskId,
      authContext.userId,
    );
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

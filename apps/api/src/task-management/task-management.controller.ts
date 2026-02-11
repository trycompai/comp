import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiExtraModels,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { TaskItemEntityType } from '@trycompai/db';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { SkipAuditLog } from '../audit/skip-audit-log.decorator';
import { TaskManagementService } from './task-management.service';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateTaskItemDto } from './dto/update-task-item.dto';
import { TaskItemResponseDto } from './dto/task-item-response.dto';
import { GetTaskItemQueryDto } from './dto/get-task-item-query.dto';
import { PaginatedTaskItemResponseDto } from './dto/paginated-task-item-response.dto';
import { GetTaskItemStatsQueryDto } from './dto/get-task-item-stats-query.dto';
import { AttachmentsService } from '../attachments/attachments.service';
import { UploadTaskItemAttachmentDto } from './dto/upload-task-item-attachment.dto';
import { AttachmentResponseDto } from '../tasks/dto/task-responses.dto';
import { TaskItemAuditService } from './task-item-audit.service';

@ApiTags('Task Management')
@Controller({ path: 'task-management', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@RequirePermission('task', ['create', 'read', 'update', 'delete'])
@ApiSecurity('apikey')
export class TaskManagementController {
  constructor(
    private readonly taskManagementService: TaskManagementService,
    private readonly attachmentsService: AttachmentsService,
    private readonly auditService: TaskItemAuditService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get task items statistics for an entity',
    description:
      'Retrieve task items statistics (total count, counts by status) for a specific entity',
  })
  @ApiQuery({
    name: 'entityId',
    description: 'ID of the entity to get task items stats for',
    example: 'vnd_abc123def456',
  })
  @ApiQuery({
    name: 'entityType',
    description: 'Type of entity',
    enum: TaskItemEntityType,
    example: TaskItemEntityType.vendor,
  })
  @ApiResponse({
    status: 200,
    description: 'Task items statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byStatus: {
          type: 'object',
          properties: {
            todo: { type: 'number' },
            in_progress: { type: 'number' },
            in_review: { type: 'number' },
            done: { type: 'number' },
            canceled: { type: 'number' },
          },
        },
      },
    },
  })
  async getTaskItemsStats(
    @OrganizationId() organizationId: string,
    @Query() query: GetTaskItemStatsQueryDto,
  ) {
    try {
      return await this.taskManagementService.getTaskItemsStats(
        organizationId,
        query.entityId,
        query.entityType,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get task items for an entity',
    description:
      'Retrieve paginated task items for a specific entity (vendor, risk)',
  })
  @ApiResponse({
    status: 200,
    description: 'Task items retrieved successfully',
    type: PaginatedTaskItemResponseDto,
  })
  async getTaskItems(
    @OrganizationId() organizationId: string,
    @Query() query: GetTaskItemQueryDto,
  ): Promise<PaginatedTaskItemResponseDto> {
    try {
      return await this.taskManagementService.getTaskItems(
        organizationId,
        query,
      );
    } catch (error) {
      throw error;
    }
  }

  @Post()
  @SkipAuditLog()
  @ApiOperation({
    summary: 'Create a new task item',
    description: 'Create a task item for an entity',
  })
  @ApiBody({ type: CreateTaskItemDto })
  @ApiResponse({
    status: 201,
    description: 'Task item created successfully',
    type: TaskItemResponseDto,
  })
  async createTaskItem(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() createTaskItemDto: CreateTaskItemDto,
  ): Promise<TaskItemResponseDto> {
    try {
      if (authContext.isApiKey) {
        throw new BadRequestException(
          'Task item creation is not supported with API key authentication',
        );
      }
      return await this.taskManagementService.createTaskItem(
        organizationId,
        authContext,
        createTaskItemDto,
      );
    } catch (error) {
      throw error;
    }
  }

  @Put(':id')
  @SkipAuditLog()
  @ApiOperation({
    summary: 'Update a task item',
    description: 'Update an existing task item',
  })
  @ApiParam({
    name: 'id',
    description: 'Task item ID',
    example: 'tski_abc123def456',
  })
  @ApiBody({ type: UpdateTaskItemDto })
  @ApiResponse({
    status: 200,
    description: 'Task item updated successfully',
    type: TaskItemResponseDto,
  })
  async updateTaskItem(
    @Param('id') taskItemId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() updateTaskItemDto: UpdateTaskItemDto,
  ): Promise<TaskItemResponseDto> {
    try {
      if (authContext.isApiKey) {
        throw new BadRequestException(
          'Task item updates are not supported with API key authentication',
        );
      }
      return await this.taskManagementService.updateTaskItem(
        taskItemId,
        organizationId,
        authContext,
        updateTaskItemDto,
      );
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a task item',
    description: 'Delete an existing task item',
  })
  @ApiParam({
    name: 'id',
    description: 'Task item ID',
    example: 'tski_abc123def456',
  })
  @ApiResponse({
    status: 204,
    description: 'Task item deleted successfully',
  })
  async deleteTaskItem(
    @Param('id') taskItemId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ): Promise<void> {
    try {
      if (authContext.isApiKey) {
        throw new BadRequestException(
          'Task item deletion is not supported with API key authentication',
        );
      }
      await this.taskManagementService.deleteTaskItem(
        taskItemId,
        organizationId,
      );
    } catch (error) {
      throw error;
    }
  }

  @Post('attachments')
  @ApiOperation({
    summary: 'Upload attachment to task item',
    description:
      'Upload a file attachment for a task item with proper S3 path structure: org_{orgId}/attachments/task-item/{entityType}/{entityId}/files',
  })
  @ApiBody({ type: UploadTaskItemAttachmentDto })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: AttachmentResponseDto,
  })
  async uploadTaskItemAttachment(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() uploadDto: UploadTaskItemAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    try {
      // Pass entityType and entityId via description field for S3 path construction
      // Format: "{entityType}|{entityId}" - e.g., "vendor|vnd_abc123"
      const description = `${uploadDto.entityType}|${uploadDto.entityId}`;

      return await this.attachmentsService.uploadAttachment(
        organizationId,
        uploadDto.entityId, // This is the vendor/risk ID (used as entityId in attachment record)
        'task_item', // This is the AttachmentEntityType
        {
          fileName: uploadDto.fileName,
          fileType: uploadDto.fileType,
          fileData: uploadDto.fileData,
          description, // Contains task item's entityType and entityId for S3 path
        },
        authContext.userId,
      );
    } catch (error) {
      throw error;
    }
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({
    summary: 'Delete attachment from task item',
    description:
      'Delete a file attachment for a task item (removes from S3 and database)',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Attachment ID',
    example: 'att_abc123def456',
  })
  @ApiResponse({
    status: 204,
    description: 'Attachment deleted successfully',
  })
  async deleteTaskItemAttachment(
    @OrganizationId() organizationId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<void> {
    try {
      await this.attachmentsService.deleteAttachment(
        organizationId,
        attachmentId,
      );
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/activity')
  @ApiOperation({
    summary: 'Get task item activity log',
    description: 'Retrieve all activity/audit logs for a specific task item',
  })
  @ApiParam({
    name: 'id',
    description: 'Task item ID',
    example: 'tski_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved successfully',
  })
  async getTaskItemActivity(
    @Param('id') taskItemId: string,
    @OrganizationId() organizationId: string,
  ) {
    try {
      return await this.auditService.getTaskItemActivity(
        taskItemId,
        organizationId,
      );
    } catch (error) {
      throw error;
    }
  }
}

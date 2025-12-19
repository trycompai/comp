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
  InternalServerErrorException,
} from '@nestjs/common';
import {
    ApiBody,
    ApiHeader,
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
import { Role, TaskItemEntityType } from '@trycompai/db';
import { RequireRoles } from '../auth/role-validator.guard';
import { TaskManagementService } from './task-management.service';
import { CreateTaskItemDto } from './dto/create-task-item.dto';
import { UpdateTaskItemDto } from './dto/update-task-item.dto';
import { TaskItemResponseDto } from './dto/task-item-response.dto';
import { GetTaskItemQueryDto } from './dto/get-task-item-query.dto';
import { PaginatedTaskItemResponseDto } from './dto/paginated-task-item-response.dto';

@ApiTags('Task Management')
@Controller({ path: 'task-management', version: '1' })
@UseGuards(HybridAuthGuard, RequireRoles(Role.admin, Role.owner))
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class TaskManagementController {
  constructor(private readonly taskManagementService: TaskManagementService) {}

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
    @Query('entityId') entityId: string,
    @Query('entityType') entityType: TaskItemEntityType,
  ) {
    try {
      return await this.taskManagementService.getTaskItemsStats(
        organizationId,
        entityId,
        entityType,
      );
    } catch (error) {
      throw error;
    }
  }

    @Get()
  @ApiOperation({
    summary: 'Get task items for an entity',
    description:
      'Retrieve paginated task items for a specific entity (vendor, risk, policy, control)',
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
  ): Promise<void> {
    try {
      await this.taskManagementService.deleteTaskItem(taskItemId, organizationId);
    } catch (error) {
      throw error;
    }
  }
}


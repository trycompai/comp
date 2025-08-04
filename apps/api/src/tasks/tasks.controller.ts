import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type {
  CreateTaskDto,
  PaginatedTasksResponseDto,
  TaskQueryDto,
  TaskResponseDto,
  UpdateTaskDto,
} from './schemas/task.schemas';
import {
  CreateTaskSchema,
  TaskQuerySchema,
  UpdateTaskSchema,
} from './schemas/task.schemas';
import { TasksService } from './tasks.service';
// Import DTOs for Swagger decorators
import { ApiKeyGuard } from '../auth/api-key.guard';
import { Organization } from '../auth/organization.decorator';
import {
  PaginatedTasksResponseDto as PaginatedTasksSwagger,
  TaskQueryDto as TaskQuerySwagger,
  TaskResponseDto as TaskResponseSwagger,
} from './dto/swagger.dto';

@ApiTags('Tasks')
@Controller({ path: 'tasks', version: '1' })
@UseGuards(ApiKeyGuard)
@ApiSecurity('apikey')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new task',
    description: 'Creates a new task for the authenticated organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseSwagger,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid task data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async create(
    @Body(new ZodValidationPipe(CreateTaskSchema)) createTaskDto: CreateTaskDto,
    @Organization() organizationId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.create(createTaskDto, organizationId);
  }

  @Get()
  @ApiOperation({
    summary: 'List tasks with pagination and filtering',
    description:
      'Retrieves a paginated list of tasks for the authenticated organization with optional filtering',
  })
  @ApiQuery({ type: TaskQuerySwagger })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: PaginatedTasksSwagger,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async findAll(
    @Query(new ZodValidationPipe(TaskQuerySchema)) query: TaskQueryDto,
    @Organization() organizationId: string,
  ): Promise<PaginatedTasksResponseDto> {
    return this.tasksService.findAll(query, organizationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific task',
    description:
      'Retrieves a specific task by ID for the authenticated organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseSwagger,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async findOne(
    @Param('id') id: string,
    @Organization() organizationId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Updates a specific task by ID for the authenticated organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseSwagger,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid task data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) updateTaskDto: UpdateTaskDto,
    @Organization() organizationId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.update(id, updateTaskDto, organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a task',
    description:
      'Deletes a specific task by ID for the authenticated organization',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 204,
    description: 'Task deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async remove(
    @Param('id') id: string,
    @Organization() organizationId: string,
  ): Promise<void> {
    return this.tasksService.remove(id, organizationId);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Mark a task as complete',
    description:
      'Marks a specific task as done and sets the completion timestamp',
  })
  @ApiParam({
    name: 'id',
    description: 'Task ID',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Task marked as complete successfully',
    type: TaskResponseSwagger,
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async markComplete(
    @Param('id') id: string,
    @Organization() organizationId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.markComplete(id, organizationId);
  }
}

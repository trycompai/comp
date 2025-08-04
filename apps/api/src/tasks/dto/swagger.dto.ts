import { ApiProperty } from '@nestjs/swagger';

// Simple DTOs for Swagger documentation - Zod handles actual validation
export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Review security policies',
  })
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Conduct quarterly review of all security policies and procedures',
  })
  description: string;

  @ApiProperty({
    description: 'Task status',
    enum: ['todo', 'in_progress', 'done', 'not_relevant'],
    default: 'todo',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Task frequency',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  frequency?: string;

  @ApiProperty({
    description: 'Department assignment',
    enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
    default: 'none',
    required: false,
  })
  department?: string;

  @ApiProperty({
    description: 'Task order for sorting',
    default: 0,
    required: false,
  })
  order?: number;

  @ApiProperty({ description: 'Assignee member ID', required: false })
  assigneeId?: string;

  @ApiProperty({ description: 'Task template ID', required: false })
  taskTemplateId?: string;
}

export class UpdateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Review security policies',
    required: false,
  })
  title?: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Conduct quarterly review of all security policies and procedures',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Task status',
    enum: ['todo', 'in_progress', 'done', 'not_relevant'],
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Task frequency',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  frequency?: string;

  @ApiProperty({
    description: 'Department assignment',
    enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
    required: false,
  })
  department?: string;

  @ApiProperty({ description: 'Task order for sorting', required: false })
  order?: number;

  @ApiProperty({ description: 'Assignee member ID', required: false })
  assigneeId?: string;

  @ApiProperty({ description: 'Task template ID', required: false })
  taskTemplateId?: string;
}

export class TaskQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    default: 1,
    required: false,
  })
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    default: 20,
    required: false,
  })
  limit?: number;

  @ApiProperty({
    description: 'Filter by status',
    enum: ['todo', 'in_progress', 'done', 'not_relevant'],
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Filter by frequency',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: false,
  })
  frequency?: string;

  @ApiProperty({
    description: 'Filter by department',
    enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
    required: false,
  })
  department?: string;

  @ApiProperty({ description: 'Filter by assignee ID', required: false })
  assigneeId?: string;

  @ApiProperty({
    description: 'Search tasks by title or description',
    required: false,
  })
  search?: string;
}

export class TaskResponseDto {
  @ApiProperty({ description: 'Task ID', example: 'tsk_abc123def456' })
  id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Review security policies',
  })
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Conduct quarterly review of all security policies and procedures',
  })
  description: string;

  @ApiProperty({
    description: 'Task status',
    enum: ['todo', 'in_progress', 'done', 'not_relevant'],
  })
  status: string;

  @ApiProperty({
    description: 'Task frequency',
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    nullable: true,
  })
  frequency: string | null;

  @ApiProperty({
    description: 'Department assignment',
    enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
    nullable: true,
  })
  department: string | null;

  @ApiProperty({ description: 'Task order for sorting' })
  order: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Last completion date', nullable: true })
  lastCompletedAt: Date | null;

  @ApiProperty({ description: 'Assignee member ID', nullable: true })
  assigneeId: string | null;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Task template ID', nullable: true })
  taskTemplateId: string | null;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there are previous pages' })
  hasPrevPage: boolean;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto], description: 'Array of tasks' })
  tasks: TaskResponseDto[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Pagination metadata' })
  meta: PaginationMetaDto;
}

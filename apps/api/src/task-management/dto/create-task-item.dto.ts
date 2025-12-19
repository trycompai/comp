import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TaskItemEntityType, TaskItemStatus, TaskItemPriority } from '@db';

export class CreateTaskItemDto {
  @ApiProperty({ description: 'Task title', example: 'Review vendor contract' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Task status',
    enum: TaskItemStatus,
    default: TaskItemStatus.todo
  })
  @IsOptional()
  @IsEnum(TaskItemStatus)
  status?: TaskItemStatus;

  @ApiPropertyOptional({ 
    description: 'Task priority',
    enum: TaskItemPriority,
    default: TaskItemPriority.medium
  })
  @IsOptional()
  @IsEnum(TaskItemPriority)
  priority?: TaskItemPriority;

  @ApiProperty({ description: 'ID of the entity this task belongs to' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ 
    description: 'Type of entity',
    enum: TaskItemEntityType,
    example: TaskItemEntityType.vendor
  })
  @IsEnum(TaskItemEntityType)
  entityType: TaskItemEntityType;

  @ApiPropertyOptional({ description: 'Assignee member ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assigneeId?: string;
}
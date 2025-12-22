import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskItemPriority, TaskItemStatus } from '@db';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskItemDto {
  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskItemStatus,
  })
  @IsOptional()
  @IsEnum(TaskItemStatus)
  status?: TaskItemStatus;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskItemPriority,
  })
  @IsOptional()
  @IsEnum(TaskItemPriority)
  priority?: TaskItemPriority;

  @ApiPropertyOptional({
    description: 'Assignee member ID (set to null to unassign)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.assigneeId !== null)
  @IsString()
  assigneeId?: string | null;
}

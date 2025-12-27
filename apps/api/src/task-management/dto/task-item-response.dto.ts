import { ApiProperty } from '@nestjs/swagger';
import { TaskItemEntityType, TaskItemStatus, TaskItemPriority } from '@db';

export class TaskItemAssigneeDto {
  @ApiProperty({ description: 'Member ID' })
  id: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export class TaskItemCreatorDto {
  @ApiProperty({ description: 'Member ID' })
  id: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export class TaskItemUpdaterDto {
  @ApiProperty({ description: 'Member ID' })
  id: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export class TaskItemResponseDto {
  @ApiProperty({ description: 'Task item ID', example: 'tski_abc123def456' })
  id: string;

  @ApiProperty({ description: 'Task title', example: 'Review vendor contract' })
  title: string;

  @ApiProperty({ description: 'Task description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Task status', enum: TaskItemStatus })
  status: TaskItemStatus;

  @ApiProperty({ description: 'Task priority', enum: TaskItemPriority })
  priority: TaskItemPriority;

  @ApiProperty({ description: 'ID of the entity this task belongs to' })
  entityId: string;

  @ApiProperty({ description: 'Type of entity', enum: TaskItemEntityType })
  entityType: TaskItemEntityType;

  @ApiProperty({
    description: 'Assignee information',
    nullable: true,
    type: TaskItemAssigneeDto,
  })
  assignee: TaskItemAssigneeDto | null;

  @ApiProperty({ description: 'Creator information', type: TaskItemCreatorDto })
  createdBy: TaskItemCreatorDto;

  @ApiProperty({
    description: 'Last updater information',
    nullable: true,
    type: TaskItemUpdaterDto,
  })
  updatedBy: TaskItemUpdaterDto | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

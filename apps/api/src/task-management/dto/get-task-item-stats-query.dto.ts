import { ApiProperty } from '@nestjs/swagger';
import { TaskItemEntityType } from '@db';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class GetTaskItemStatsQueryDto {
  @ApiProperty({
    description: 'ID of the entity to get task items stats for',
    example: 'vnd_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'Type of entity',
    enum: TaskItemEntityType,
    example: TaskItemEntityType.vendor,
  })
  @IsEnum(TaskItemEntityType)
  entityType: TaskItemEntityType;
}



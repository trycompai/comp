import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskItemEntityType, TaskItemStatus, TaskItemPriority } from "@db";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from 'class-transformer';

export enum TaskItemSortBy {
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
    TITLE = 'title',
    STATUS = 'status',
    PRIORITY = 'priority',
}

export enum TaskItemSortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class GetTaskItemQueryDto {
    @ApiProperty({
        description: 'ID of the entity to get task items for',
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
    @IsNotEmpty()
    entityType: TaskItemEntityType;

    @ApiPropertyOptional({
        description: 'Page number (1-indexed)',
        example: 1,
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 5,
        default: 5,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 5;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: TaskItemStatus,
        example: TaskItemStatus.todo,
    })
    @IsOptional()
    @IsEnum(TaskItemStatus)
    status?: TaskItemStatus;

    @ApiPropertyOptional({
        description: 'Filter by priority',
        enum: TaskItemPriority,
        example: TaskItemPriority.high,
    })
    @IsOptional()
    @IsEnum(TaskItemPriority)
    priority?: TaskItemPriority;

    @ApiPropertyOptional({
        description: 'Filter by assignee ID',
        example: 'mbr_abc123def456',
    })
    @IsOptional()
    @IsString()
    assigneeId?: string;

    @ApiPropertyOptional({
        description: 'Sort by field',
        enum: TaskItemSortBy,
        example: TaskItemSortBy.CREATED_AT,
        default: TaskItemSortBy.CREATED_AT,
    })
    @IsOptional()
    @IsEnum(TaskItemSortBy)
    sortBy?: TaskItemSortBy = TaskItemSortBy.CREATED_AT;

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: TaskItemSortOrder,
        example: TaskItemSortOrder.DESC,
        default: TaskItemSortOrder.DESC,
    })
    @IsOptional()
    @IsEnum(TaskItemSortOrder)
    sortOrder?: TaskItemSortOrder = TaskItemSortOrder.DESC;
}
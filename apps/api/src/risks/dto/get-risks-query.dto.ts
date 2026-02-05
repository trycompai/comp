import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RiskCategory,
  Departments,
  RiskStatus,
} from '@trycompai/db';

export enum RiskSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
  STATUS = 'status',
}

export enum RiskSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetRisksQueryDto {
  @ApiPropertyOptional({
    description: 'Search by title (case-insensitive contains)',
    example: 'data breach',
  })
  @IsOptional()
  @IsString()
  title?: string;

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
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 250,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  perPage?: number = 50;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: RiskSortBy,
    default: RiskSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(RiskSortBy)
  sort?: RiskSortBy = RiskSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: RiskSortOrder,
    default: RiskSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(RiskSortOrder)
  sortDirection?: RiskSortOrder = RiskSortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: RiskStatus,
  })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: RiskCategory,
  })
  @IsOptional()
  @IsEnum(RiskCategory)
  category?: RiskCategory;

  @ApiPropertyOptional({
    description: 'Filter by department',
    enum: Departments,
  })
  @IsOptional()
  @IsEnum(Departments)
  department?: Departments;

  @ApiPropertyOptional({
    description: 'Filter by assignee member ID',
    example: 'mem_abc123def456',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

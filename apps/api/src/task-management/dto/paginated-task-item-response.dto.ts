import { ApiProperty } from '@nestjs/swagger';
import { TaskItemResponseDto } from './task-item-response.dto';

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

export class PaginatedTaskItemResponseDto {
  @ApiProperty({
    type: [TaskItemResponseDto],
    description: 'Array of task items',
  })
  data: TaskItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto, description: 'Pagination metadata' })
  meta: PaginationMetaDto;
}

import {
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { COMPLETION_TYPES, type CompletionType } from '../timeline-constants';

export class UpdatePhaseDto {
  @ApiPropertyOptional({ description: 'Phase name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phase description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in weeks', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @ApiPropertyOptional({
    description: 'Phase start date',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Phase end date',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Whether dates are pinned (not recalculated automatically)',
  })
  @IsOptional()
  @IsBoolean()
  datesPinned?: boolean;

  @ApiPropertyOptional({
    description: 'How the phase is completed',
    enum: COMPLETION_TYPES,
  })
  @IsOptional()
  @IsIn(COMPLETION_TYPES)
  completionType?: CompletionType;

  @ApiPropertyOptional({
    description: 'Whether completing this phase should lock the timeline',
  })
  @IsOptional()
  @IsBoolean()
  locksTimelineOnComplete?: boolean;
}

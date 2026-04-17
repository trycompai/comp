import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { COMPLETION_TYPES, type CompletionType } from '../timeline-constants';

export class UpdatePhaseTemplateDto {
  @ApiPropertyOptional({ description: 'Phase name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Phase description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Group label for sub-phase grouping' })
  @IsOptional()
  @IsString()
  groupLabel?: string;

  @ApiPropertyOptional({
    description: 'Position in the phase sequence (0-based)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Default duration in weeks',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultDurationWeeks?: number;

  @ApiPropertyOptional({
    description: 'How the phase is completed',
    enum: COMPLETION_TYPES,
  })
  @IsOptional()
  @IsIn(COMPLETION_TYPES)
  completionType?: CompletionType;

  @ApiPropertyOptional({
    description:
      'If true, completing this phase locks timeline automation state',
  })
  @IsOptional()
  @IsBoolean()
  locksTimelineOnComplete?: boolean;
}

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COMPLETION_TYPES, type CompletionType } from '../timeline-constants';

export class CreatePhaseTemplateDto {
  @ApiProperty({ description: 'Phase name', example: 'Gap Assessment' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Phase description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Group label for sub-phase grouping' })
  @IsOptional()
  @IsString()
  groupLabel?: string;

  @ApiProperty({
    description: 'Position in the phase sequence (0-based)',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiProperty({
    description: 'Default duration in weeks',
    minimum: 1,
    example: 4,
  })
  @IsInt()
  @Min(1)
  defaultDurationWeeks: number;

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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  locksTimelineOnComplete?: boolean;
}

export class AddPhaseToInstanceDto {
  @ApiProperty({ description: 'Phase name', example: 'Remediation' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Phase description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Position in the phase sequence (0-based)',
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiProperty({
    description: 'Duration in weeks',
    minimum: 1,
    example: 4,
  })
  @IsInt()
  @Min(1)
  durationWeeks: number;

  @ApiPropertyOptional({
    description: 'How the phase is completed',
    enum: COMPLETION_TYPES,
  })
  @IsOptional()
  @IsIn(COMPLETION_TYPES)
  completionType?: CompletionType;
}

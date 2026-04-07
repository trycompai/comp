import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PhaseCompletionType } from '@db';

const COMPLETION_TYPES = Object.values(PhaseCompletionType);

export class CreatePhaseTemplateDto {
  @ApiProperty({ description: 'Phase name', example: 'Gap Assessment' })
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
  @IsNumber()
  @Min(0)
  orderIndex: number;

  @ApiProperty({
    description: 'Default duration in weeks',
    minimum: 1,
    example: 4,
  })
  @IsNumber()
  @Min(1)
  defaultDurationWeeks: number;

  @ApiPropertyOptional({
    description: 'How the phase is completed',
    enum: COMPLETION_TYPES,
  })
  @IsOptional()
  @IsIn(COMPLETION_TYPES)
  completionType?: string;
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
  @IsNumber()
  @Min(0)
  orderIndex: number;

  @ApiProperty({
    description: 'Duration in weeks',
    minimum: 1,
    example: 4,
  })
  @IsNumber()
  @Min(1)
  durationWeeks: number;

  @ApiPropertyOptional({
    description: 'How the phase is completed',
    enum: COMPLETION_TYPES,
  })
  @IsOptional()
  @IsIn(COMPLETION_TYPES)
  completionType?: string;
}

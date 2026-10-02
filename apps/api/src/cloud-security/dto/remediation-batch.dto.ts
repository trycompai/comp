import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class BatchFindingDto {
  @ApiProperty({ description: 'Finding ID from this connection.' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'Remediation key for the finding.' })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty({ description: 'Finding title shown during remediation.' })
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class CreateRemediationBatchDto {
  @ApiProperty({
    description: 'Active integration connection in your organization.',
  })
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @ApiProperty({
    description: 'Findings belonging to this connection.',
    type: [BatchFindingDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BatchFindingDto)
  findings!: BatchFindingDto[];
}

export class UpdateRemediationBatchDto {
  @ApiPropertyOptional({
    description: 'Run ID whose task and payload match this batch.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^run_[a-zA-Z0-9_-]+$/)
  triggerRunId?: string;

  @ApiPropertyOptional({
    description: 'Batch status.',
    enum: ['running', 'done', 'cancelled'],
  })
  @IsOptional()
  @IsIn(['running', 'done', 'cancelled'])
  status?: 'running' | 'done' | 'cancelled';
}

export class CancelRemediationBatchDto {
  @ApiProperty({ description: 'Expected run ID already bound to this batch.' })
  @IsString()
  @Matches(/^run_[a-zA-Z0-9_-]+$/)
  runId!: string;
}

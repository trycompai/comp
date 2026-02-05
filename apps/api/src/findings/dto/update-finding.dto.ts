import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { FindingStatus, FindingType } from '@trycompai/db';

export class UpdateFindingDto {
  @ApiProperty({
    description: 'Finding status',
    enum: FindingStatus,
    required: false,
  })
  @IsEnum(FindingStatus)
  @IsOptional()
  status?: FindingStatus;

  @ApiProperty({
    description: 'Type of finding (SOC 2 or ISO 27001)',
    enum: FindingType,
    required: false,
  })
  @IsEnum(FindingType)
  @IsOptional()
  type?: FindingType;

  @ApiProperty({
    description: 'Finding content/message',
    example:
      'The uploaded evidence does not clearly show the Organization Name or URL.',
    maxLength: 5000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Content cannot be empty if provided' })
  @MaxLength(5000)
  content?: string;

  @ApiProperty({
    description:
      'Auditor note when requesting revision (only for needs_revision status)',
    example: 'Please provide clearer screenshots showing the timestamp.',
    maxLength: 2000,
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  revisionNote?: string | null;
}

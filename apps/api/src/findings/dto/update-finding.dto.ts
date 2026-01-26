import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
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
  @MaxLength(5000)
  content?: string;
}

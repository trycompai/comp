import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { FindingSeverity, FindingStatus, FindingType } from '@db';

export class UpdateFindingDto {
  @ApiProperty({ description: 'Finding status', enum: FindingStatus, required: false })
  @IsEnum(FindingStatus)
  @IsOptional()
  status?: FindingStatus;

  @ApiProperty({ description: 'Finding type', enum: FindingType, required: false })
  @IsEnum(FindingType)
  @IsOptional()
  type?: FindingType;

  @ApiProperty({ description: 'Severity', enum: FindingSeverity, required: false })
  @IsEnum(FindingSeverity)
  @IsOptional()
  severity?: FindingSeverity;

  @ApiProperty({ description: 'Finding content/message', maxLength: 5000, required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Content cannot be empty if provided' })
  @MaxLength(5000)
  content?: string;

  @ApiProperty({
    description: 'Auditor note when requesting revision',
    maxLength: 2000,
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  revisionNote?: string | null;
}

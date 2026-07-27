import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { REQUIREMENT_DESCRIPTION_MAX_LENGTH } from '../../constants';

export class CreateRequirementDto {
  @ApiProperty({ example: 'frk_abc123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  frameworkId: string;

  @ApiProperty({ example: 'CC1.1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'cc1-1' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  identifier?: string;

  @ApiProperty({ example: 'Control environment requirements' })
  @IsString()
  @MaxLength(REQUIREMENT_DESCRIPTION_MAX_LENGTH)
  description: string;

  @ApiPropertyOptional({ example: 'Access Control' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requirementFamily?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Display order within the framework (lower sorts first).',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

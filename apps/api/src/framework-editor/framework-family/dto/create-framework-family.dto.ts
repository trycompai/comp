import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FrameworkEditorFrameworkFamilyStatus } from '@db';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFrameworkFamilyDto {
  @ApiProperty({ example: 'NIST SP800-53' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'All NIST SP800-53 control families' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: FrameworkEditorFrameworkFamilyStatus,
    example: FrameworkEditorFrameworkFamilyStatus.hidden,
  })
  @IsEnum(FrameworkEditorFrameworkFamilyStatus)
  @IsOptional()
  status?: FrameworkEditorFrameworkFamilyStatus;
}

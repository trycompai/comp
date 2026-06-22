import { ApiPropertyOptional } from '@nestjs/swagger';
import { FrameworkEditorFrameworkFamilyStatus } from '@db';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFrameworkFamilyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: FrameworkEditorFrameworkFamilyStatus })
  @IsEnum(FrameworkEditorFrameworkFamilyStatus)
  @IsOptional()
  status?: FrameworkEditorFrameworkFamilyStatus;
}

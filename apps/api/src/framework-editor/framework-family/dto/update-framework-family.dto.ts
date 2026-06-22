import { ApiPropertyOptional } from '@nestjs/swagger';
import { FrameworkEditorFrameworkFamilyStatus } from '@db';
import { IsEnum, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

// Each field is optional (may be omitted) but must NOT be null when present —
// @ValidateIf runs the validators whenever the key is sent (incl. null), so a
// null reaches @IsString/@IsEnum and is rejected with a 400 instead of slipping
// through to a non-nullable Prisma column. (@IsOptional() would skip null.)
export class UpdateFrameworkFamilyDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => o.name !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.description !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: FrameworkEditorFrameworkFamilyStatus })
  @ValidateIf((o) => o.status !== undefined)
  @IsEnum(FrameworkEditorFrameworkFamilyStatus)
  status?: FrameworkEditorFrameworkFamilyStatus;
}

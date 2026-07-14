import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Trim strings so a whitespace-only value collapses to '' and is rejected by
// MinLength. Guard on typeof so null/non-strings pass through unchanged and are
// still rejected by @IsString (using value?.trim() would turn null into
// undefined, which ValidateIf would then treat as an omitted field).
const trimIfString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateCustomFrameworkDto {
  // ValidateIf (rather than @IsOptional) only skips validation when the field is
  // omitted (undefined). An explicit `null` still runs @IsString and is rejected
  // with a 400, instead of slipping through to a non-null DB column.
  @ApiPropertyOptional({ description: 'Framework name', example: 'Internal Controls' })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimIfString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Framework description' })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimIfString)
  @IsString()
  @MaxLength(2000)
  description?: string;
}

import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomFrameworkDto {
  // ValidateIf (rather than @IsOptional) only skips validation when the field is
  // omitted (undefined). An explicit `null` still runs @IsString and is rejected
  // with a 400, instead of slipping through to a non-null DB column.
  @ApiPropertyOptional({ description: 'Framework name', example: 'Internal Controls' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Framework description' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;
}

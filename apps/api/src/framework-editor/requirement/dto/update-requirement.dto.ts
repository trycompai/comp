import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRequirementDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  identifier?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  requirementFamily?: string;

  // Nullable so the editor can clear an order back to "unset". @IsOptional()
  // skips validation for both null and undefined, letting null pass through.
  @ApiPropertyOptional({ nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number | null;
}

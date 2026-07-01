import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomFrameworkDto {
  @ApiPropertyOptional({ description: 'Framework name', example: 'Internal Controls' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Framework description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

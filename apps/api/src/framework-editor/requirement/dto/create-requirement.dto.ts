import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

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
  @MaxLength(5000)
  description: string;
}

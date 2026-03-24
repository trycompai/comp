import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateFrameworkInstanceRequirementDto {
  @ApiProperty({ example: 'frm_abc123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  frameworkInstanceId: string;

  @ApiProperty({ example: 'Custom Access Control' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'CUSTOM-1' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  identifier?: string;

  @ApiProperty({ example: 'Custom requirement for access control policies' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;
}

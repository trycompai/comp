import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateControlTemplateDto {
  @ApiProperty({ example: 'Access Control Policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Ensures access controls are properly managed' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ example: ['penetration-test', 'rbac-matrix'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documentTypes?: string[];
}

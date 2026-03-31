import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Frequency, Departments } from '@trycompai/db';

export class CreateTaskTemplateDto {
  @ApiProperty({
    description: 'Task template name',
    example: 'Monthly Security Review',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the task template',
    example: 'Review and update security policies on a monthly basis',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Frequency of the task',
    enum: Frequency,
    example: Frequency.monthly,
  })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @ApiPropertyOptional({
    description: 'Department responsible for the task',
    enum: Departments,
    example: Departments.it,
  })
  @IsOptional()
  @IsEnum(Departments)
  department?: Departments;
}

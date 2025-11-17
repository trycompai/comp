import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Frequency, Departments } from '@trycompai/db';

export class CreateTaskTemplateDto {
  @ApiProperty({
    description: 'Task template name',
    example: 'Monthly Security Review',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the task template',
    example: 'Review and update security policies on a monthly basis',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Frequency of the task',
    enum: Frequency,
    example: Frequency.monthly,
  })
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiProperty({
    description: 'Department responsible for the task',
    enum: Departments,
    example: Departments.it,
  })
  @IsEnum(Departments)
  department: Departments;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Frequency, Departments } from '@db';

export class CreatePolicyTemplateDto {
  @ApiProperty({ example: 'Information Security Policy' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Establishes information security practices' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ enum: Frequency, example: 'annually' })
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiProperty({ enum: Departments, example: 'it' })
  @IsEnum(Departments)
  department: Departments;
}

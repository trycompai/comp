import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import {
  PolicyStatus,
  Frequency,
  Departments,
  DEPARTMENT_MAX_LENGTH,
} from '../../policies/dto/create-policy.dto';

export class CreateAdminPolicyDto {
  @ApiProperty({
    description: 'Name of the policy',
    example: 'Data Privacy Policy',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the policy',
    example: 'Outlines data handling procedures',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Status of the policy',
    enum: PolicyStatus,
    example: PolicyStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @ApiProperty({
    description: 'Review frequency',
    enum: Frequency,
    example: Frequency.YEARLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @ApiProperty({
    description:
      'Department this policy applies to. Built-in values: none, admin, gov, hr, it, itsm, qms. Custom department names are also accepted.',
    example: Departments.IT,
    required: false,
    type: 'string',
    maxLength: DEPARTMENT_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(DEPARTMENT_MAX_LENGTH)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  department?: string;
}

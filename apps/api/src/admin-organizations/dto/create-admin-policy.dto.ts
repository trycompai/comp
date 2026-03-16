import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import {
  PolicyStatus,
  Frequency,
  Departments,
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
    description: 'Department this policy applies to',
    enum: Departments,
    example: Departments.IT,
    required: false,
  })
  @IsOptional()
  @IsEnum(Departments)
  department?: Departments;
}

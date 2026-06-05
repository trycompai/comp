import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Departments } from '@db';
import { DEPARTMENT_MAX_LENGTH } from '../../policies/dto/create-policy.dto';

export class CreatePeopleDto {
  @ApiProperty({
    description: 'User ID to associate with this member',
    example: 'usr_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Role for the member (built-in role name or custom role ID)',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({
    description:
      'Member department. Built-in values: none, admin, gov, hr, it, itsm, qms. Custom department names are also accepted.',
    example: Departments.it,
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

  @ApiProperty({
    description: 'Whether member is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'FleetDM label ID for member devices',
    example: 123,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  fleetDmLabelId?: number;

  @ApiProperty({
    description: 'Job title for the member',
    example: 'Software Engineer',
    required: false,
  })
  @IsOptional()
  @IsString()
  jobTitle?: string;
}

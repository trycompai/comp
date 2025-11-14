import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Departments } from '@trycompai/db';

export class CreatePeopleDto {
  @ApiProperty({
    description: 'User ID to associate with this member',
    example: 'usr_abc123def456',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Role for the member',
    example: 'admin',
  })
  @IsString()
  role: string;

  @ApiProperty({
    description: 'Member department',
    enum: Departments,
    example: Departments.it,
    required: false,
  })
  @IsOptional()
  @IsEnum(Departments)
  department?: Departments;

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
}

import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsString,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { CreatePeopleDto } from './create-people.dto';

export class UpdatePeopleDto extends PartialType(CreatePeopleDto) {
  @ApiProperty({
    description: 'Whether to deactivate this member (soft delete)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Name of the associated user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email of the associated user',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Member join date (createdAt override)',
    example: '2024-01-15T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdAt?: string;
}

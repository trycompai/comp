import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'New name for the custom role',
    example: 'Compliance Manager',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9\s-]*$/, {
    message: 'Role name must start with a letter and contain only letters, numbers, spaces, and hyphens',
  })
  name?: string;

  @ApiProperty({
    description: 'Updated permissions for the role. Keys are resource names, values are arrays of allowed actions.',
    example: {
      control: ['read', 'update', 'delete'],
      policy: ['read', 'update', 'publish', 'approve'],
      risk: ['read', 'assess'],
    },
    required: false,
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, string[]>;
}

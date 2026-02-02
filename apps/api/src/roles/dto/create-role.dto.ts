import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Name of the custom role',
    example: 'compliance-lead',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9-]*$/, {
    message: 'Role name must start with a letter and contain only lowercase letters, numbers, and hyphens',
  })
  name: string;

  @ApiProperty({
    description: 'Permissions for the role. Keys are resource names, values are arrays of allowed actions.',
    example: {
      control: ['read', 'update'],
      policy: ['read', 'update', 'publish'],
      risk: ['read'],
    },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, string[]>;
}

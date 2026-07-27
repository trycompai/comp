import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { BuiltInObligationsBody } from './update-built-in-obligations.dto';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Name of the custom role',
    example: 'Compliance Lead',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9\s-]*$/, {
    message:
      'Role name must start with a letter and contain only letters, numbers, spaces, and hyphens',
  })
  name: string;

  @ApiProperty({
    description:
      'Permissions for the role. Keys are resource names, values are arrays of allowed actions.',
    example: {
      control: ['read', 'update'],
      policy: ['read', 'update'],
      risk: ['read'],
    },
  })
  @IsObject()
  @IsNotEmpty()
  permissions: Record<string, string[]>;

  @ApiProperty({
    description:
      'Obligations for the role. Boolean flags for requirements like compliance.',
    example: { compliance: true },
    required: false,
    type: BuiltInObligationsBody,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BuiltInObligationsBody)
  obligations?: BuiltInObligationsBody;
}

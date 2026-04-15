import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

const ALLOWED_INVITE_ROLES = [
  'admin',
  'auditor',
  'employee',
  'contractor',
] as const;

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited member',
    enum: ALLOWED_INVITE_ROLES,
    example: 'admin',
  })
  @IsString()
  @IsIn([...ALLOWED_INVITE_ROLES], {
    message: `Role must be one of: ${ALLOWED_INVITE_ROLES.join(', ')}`,
  })
  role: string;
}

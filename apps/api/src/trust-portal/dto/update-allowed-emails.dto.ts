import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail } from 'class-validator';

export class UpdateAllowedEmailsDto {
  @ApiProperty({
    description:
      'Email addresses that bypass NDA signing for trust portal access. Replaces the full list; send an empty array to clear it.',
    type: [String],
    example: ['person@example.com'],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];
}

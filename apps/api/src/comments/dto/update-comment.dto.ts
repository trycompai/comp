import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated content of the comment',
    example: 'This task needs to be completed by end of week (updated)',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    description:
      'Optional URL of the page where the comment was updated, used for deep-linking in notifications',
    example:
      'https://app.trycomp.ai/org_abc123/risk/rsk_abc123?taskItemId=tki_abc123#task-items',
    required: false,
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  contextUrl?: string;

  @ApiProperty({
    description:
      'User ID of the comment author (required for API key auth, ignored for JWT auth)',
    example: 'usr_abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;
}

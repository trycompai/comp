import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MaxCommentTextLength } from '../validators/max-comment-text-length.validator';

// `content` is serialized Tiptap JSON (or plain text for API callers). The
// 2000-char limit applies to the visible text a user typed, not the raw
// JSON — see MaxCommentTextLength. This raw-string cap only bounds payload
// size against pathologically formatted input.
const RAW_CONTENT_MAX_LENGTH = 50_000;

export class UpdateCommentDto {
  @ApiProperty({
    description:
      'Updated content of the comment (plain text or serialized Tiptap JSON). Limited to 2000 characters of visible text; maxLength bounds the serialized payload size, not the visible text.',
    example: 'This task needs to be completed by end of week (updated)',
    maxLength: RAW_CONTENT_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(RAW_CONTENT_MAX_LENGTH)
  @MaxCommentTextLength(2000)
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

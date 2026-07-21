import { CommentEntityType } from '@db';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UploadAttachmentDto } from '../../attachments/upload-attachment.dto';
import { MaxCommentTextLength } from '../validators/max-comment-text-length.validator';

// `content` is serialized Tiptap JSON (or plain text for API callers). The
// 2000-char limit applies to the visible text a user typed, not the raw
// JSON — see MaxCommentTextLength. This raw-string cap only bounds payload
// size against pathologically formatted input.
const RAW_CONTENT_MAX_LENGTH = 50_000;

export class CreateCommentDto {
  @ApiProperty({
    description:
      'Content of the comment (plain text or serialized Tiptap JSON). Limited to 2000 characters of visible text; maxLength bounds the serialized payload size, not the visible text.',
    example: 'This task needs to be completed by end of week',
    maxLength: RAW_CONTENT_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(RAW_CONTENT_MAX_LENGTH)
  @MaxCommentTextLength(2000)
  content: string;

  @ApiProperty({
    description: 'ID of the entity to comment on',
    example: 'tsk_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'Type of entity being commented on',
    enum: CommentEntityType,
    example: 'task',
  })
  @IsEnum(CommentEntityType)
  entityType: CommentEntityType;

  @ApiProperty({
    description:
      'Optional URL of the page where the comment was created, used for deep-linking in notifications',
    example:
      'https://app.trycomp.ai/org_abc123/vendors/vnd_abc123?taskItemId=tki_abc123#task-items',
    required: false,
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  contextUrl?: string;

  @ApiProperty({
    description: 'Optional attachments to include with the comment',
    type: [UploadAttachmentDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadAttachmentDto)
  attachments?: UploadAttachmentDto[];

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

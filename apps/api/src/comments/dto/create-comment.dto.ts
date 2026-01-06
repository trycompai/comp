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

export class CreateCommentDto {
  @ApiProperty({
    description: 'Content of the comment',
    example: 'This task needs to be completed by end of week',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
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

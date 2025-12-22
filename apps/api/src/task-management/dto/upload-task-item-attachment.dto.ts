import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { TaskItemEntityType } from '@db';

export class UploadTaskItemAttachmentDto {
  @ApiProperty({
    description: 'Name of the file',
    example: 'document.pdf',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\-]+\/[a-zA-Z0-9\-\+\.]+$/, {
    message: 'Invalid MIME type format',
  })
  fileType: string;

  @ApiProperty({
    description: 'Base64 encoded file data',
    example:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  fileData: string;

  @ApiProperty({
    description: 'Type of entity this task item belongs to (vendor or risk)',
    enum: TaskItemEntityType,
    example: TaskItemEntityType.vendor,
  })
  @IsEnum(TaskItemEntityType)
  entityType: TaskItemEntityType;

  @ApiProperty({
    description: 'ID of the entity this task item belongs to',
    example: 'vnd_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;
}


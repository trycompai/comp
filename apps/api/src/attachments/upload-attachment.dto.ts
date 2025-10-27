import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export class UploadAttachmentDto {
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
    enum: ALLOWED_FILE_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_FILE_TYPES, {
    message: `File type must be one of: ${ALLOWED_FILE_TYPES.join(', ')}`,
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
    description: 'Description of the attachment',
    example: 'Meeting notes from Q4 planning session',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

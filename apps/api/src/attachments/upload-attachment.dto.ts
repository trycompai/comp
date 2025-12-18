import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

// Block dangerous MIME types that could execute code
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload', // .exe
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sh', // Shell scripts
  'application/x-bat', // Batch files
  'text/x-sh',
  'text/x-python',
  'text/x-perl',
  'text/x-ruby',
  'application/x-httpd-php', // PHP files
  'application/x-javascript', // Executable JS (not JSON)
  'application/javascript',
  'text/javascript',
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
    description: 'Description of the attachment',
    example: 'Meeting notes from Q4 planning session',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description:
      'User ID of the user uploading the attachment (required for API key auth, ignored for JWT auth)',
    example: 'usr_abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userId?: string;
}

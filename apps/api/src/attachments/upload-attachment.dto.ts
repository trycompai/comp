import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsMimeTypeField } from '../utils/mime-type.validator';

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
  @IsMimeTypeField()
  fileType: string;

  @ApiProperty({
    description:
      'Base64-encoded file contents. For the web UI / direct callers. AI/MCP clients should instead upload via /v1/uploads/presign (purpose=attachment) and pass `s3Key` — base64 through an LLM is impractically slow and times out. Provide exactly one of fileData or s3Key.',
    required: false,
    example:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(134_217_728)
  @IsBase64()
  fileData?: string;

  @ApiProperty({
    description:
      'Key of a file already uploaded via /v1/uploads/presign (purpose=attachment). The server fetches the bytes from storage — no base64 needed. Provide exactly one of fileData or s3Key.',
    required: false,
    example: 'org_abc123/uploads/attachment/1700000000000-rbac-matrix.xlsx',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  s3Key?: string;

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

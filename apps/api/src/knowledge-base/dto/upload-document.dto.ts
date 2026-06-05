import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsOptional, IsString, MaxLength } from 'class-validator';
import { MAX_UPLOAD_BASE64_LENGTH } from '../../uploads/upload-limits';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Organization ID that owns the document' })
  @IsString()
  organizationId!: string;

  @ApiProperty({ description: 'File name', example: 'rbac-matrix.xlsx' })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  @IsString()
  fileType!: string;

  @ApiProperty({
    description:
      'Base64-encoded file contents. For the web UI / direct callers. AI/MCP clients should instead upload via /v1/uploads/presign (purpose=document) and pass `s3Key` — base64 through an LLM is impractically slow and times out. Provide exactly one of fileData or s3Key.',
    required: false,
  })
  @IsOptional()
  @IsString()
  // Cap the inline payload at the validation layer (before it is decoded),
  // matching the other migrated upload DTOs. The limit is the base64 length of
  // the 100 MiB file ceiling — see upload-limits.ts.
  @MaxLength(MAX_UPLOAD_BASE64_LENGTH)
  @IsBase64()
  fileData?: string; // base64 encoded

  @ApiProperty({
    description:
      'Key of a file already uploaded via /v1/uploads/presign (purpose=document). The server fetches the bytes from storage — no base64 needed. Provide exactly one of fileData or s3Key.',
    required: false,
  })
  @IsOptional()
  @IsString()
  s3Key?: string;

  @ApiProperty({ description: 'Optional description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

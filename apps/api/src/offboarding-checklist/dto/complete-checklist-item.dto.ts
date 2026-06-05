import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsBase64 } from 'class-validator';
import { IsMimeTypeField } from '../../utils/mime-type.validator';

export class CompleteChecklistItemDto {
  @ApiProperty({ description: 'Optional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Evidence file name', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ description: 'Evidence file MIME type', required: false })
  @IsOptional()
  @IsMimeTypeField()
  fileType?: string;

  @ApiProperty({
    description:
      'Base64-encoded evidence file. For the web UI / direct callers. AI/MCP clients should instead upload via /v1/uploads/presign (purpose=evidence) and pass `s3Key` — base64 through an LLM is impractically slow and times out. Provide fileData or s3Key (not both).',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(134_217_728)
  @IsBase64()
  fileData?: string;

  @ApiProperty({
    description:
      'Key of an evidence file already uploaded via /v1/uploads/presign (purpose=evidence). The server fetches the bytes from storage — no base64 needed. Provide fileData or s3Key (not both).',
    required: false,
  })
  @IsOptional()
  @IsString()
  s3Key?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UploadAndParseDto {
  @ApiProperty({
    description: 'Organization ID (set automatically from auth context).',
    example: 'org_abc123',
  })
  @IsString()
  organizationId!: string;

  @ApiProperty({
    description: 'Name of the questionnaire file.',
    example: 'vendor-security-questionnaire.xlsx',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file (PDF, image, XLSX, CSV, TXT).',
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  @IsString()
  fileType!: string;

  @ApiPropertyOptional({
    description:
      'Base64-encoded file contents. For the web UI / direct callers. AI/MCP clients should instead upload via /v1/uploads/presign and pass `s3Key` — base64 through an LLM is impractically slow. Provide exactly one of fileData or s3Key.',
  })
  @IsOptional()
  @IsString()
  fileData?: string;

  @ApiPropertyOptional({
    description:
      'Key of a file already uploaded via /v1/uploads/presign (purpose=questionnaire). The server fetches the bytes from storage — no base64 needed. Provide exactly one of fileData or s3Key.',
    example: 'org_abc/uploads/questionnaire/1735000000-questionnaire.xlsx',
  })
  @IsOptional()
  @IsString()
  s3Key?: string;

  @ApiPropertyOptional({
    description: 'Source of the upload.',
    enum: ['internal', 'external'],
    default: 'internal',
  })
  @IsOptional()
  @IsIn(['internal', 'external'])
  source?: 'internal' | 'external';
}

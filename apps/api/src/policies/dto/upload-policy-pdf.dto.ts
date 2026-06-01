import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadPolicyPdfDto {
  @ApiProperty({
    description:
      'Optional version ID to attach the PDF to. Omit to attach the PDF at the policy level (legacy path).',
    required: false,
    example: 'pv_abc123def456',
  })
  @IsOptional()
  @IsString()
  versionId?: string;

  @ApiProperty({
    description:
      'Filename of the PDF (e.g., "policy-v1.pdf"). Non-alphanumeric characters will be replaced with underscores when storing in S3.',
    example: 'acceptable-use-v1.pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file (e.g., "application/pdf").',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileType!: string;

  @ApiProperty({
    description:
      'Base64-encoded PDF file contents (no `data:` URI prefix). Truncated example shown.',
    example: 'JVBERi0xLjQKJ...',
  })
  @IsNotEmpty()
  @IsString()
  fileData!: string;
}

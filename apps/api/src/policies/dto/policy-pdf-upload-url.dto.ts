import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Input for requesting a presigned S3 upload URL for a policy PDF.
 * No file bytes are sent — only metadata so the API can produce the URL.
 */
export class RequestPolicyPdfUploadUrlDto {
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
    description:
      'MIME type of the file. Must be "application/pdf" — the presigned URL enforces this at upload time.',
    example: 'application/pdf',
  })
  @IsNotEmpty()
  @IsString()
  fileType!: string;
}

/**
 * Response containing the presigned URL the caller must PUT the file to,
 * the S3 key that was reserved, and how long the URL remains valid.
 */
export class PolicyPdfUploadUrlResponseDto {
  @ApiProperty({
    description:
      'Presigned S3 URL. PUT the raw file bytes to this URL with header `Content-Type: application/pdf`. No auth headers required — the signature is in the URL.',
    example:
      'https://bucket.s3.us-east-1.amazonaws.com/org_xxx/policies/pol_xxx/...?X-Amz-Signature=...',
  })
  uploadUrl!: string;

  @ApiProperty({
    description:
      'The S3 key the file will land at. Pass this back to the confirm endpoint after a successful upload.',
    example: 'org_abc/policies/pol_xyz/1735000000-acceptable-use-v1.pdf',
  })
  s3Key!: string;

  @ApiProperty({
    description: 'Seconds until the presigned URL expires.',
    example: 900,
  })
  expiresIn!: number;
}

/**
 * Input for confirming an upload — links the previously uploaded S3 object
 * to the policy (or specific version).
 */
export class ConfirmPolicyPdfUploadedDto {
  @ApiProperty({
    description: 'The exact s3Key returned by the upload-url endpoint.',
    example: 'org_abc/policies/pol_xyz/1735000000-acceptable-use-v1.pdf',
  })
  @IsNotEmpty()
  @IsString()
  s3Key!: string;

  @ApiProperty({
    description:
      'Optional version ID — must match the versionId passed to the upload-url endpoint. Omit if attaching at the policy level.',
    required: false,
    example: 'pv_abc123def456',
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}

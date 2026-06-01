import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * Logical purpose of an upload. Determines the S3 key prefix so files stay
 * organized by feature (e.g. `org_x/uploads/questionnaire/...`). Add a new
 * value here when a new feature starts accepting presigned uploads.
 */
export enum UploadPurpose {
  questionnaire = 'questionnaire',
  policyPdf = 'policy_pdf',
  evidence = 'evidence',
  attachment = 'attachment',
  general = 'general',
}

export class CreateUploadUrlDto {
  @ApiProperty({
    enum: UploadPurpose,
    description:
      'What the file is for. Controls where the file is stored and which feature is expected to consume the returned s3Key.',
    example: UploadPurpose.questionnaire,
  })
  @IsEnum(UploadPurpose)
  purpose!: UploadPurpose;

  @ApiProperty({
    description:
      'Original filename, used for the stored object name. Non-alphanumeric characters are replaced with underscores.',
    example: 'vendor-security-questionnaire.xlsx',
  })
  @IsNotEmpty()
  @IsString()
  fileName!: string;

  @ApiProperty({
    description:
      'MIME type of the file (e.g. application/pdf, text/csv). Recorded as metadata and passed to the feature endpoint; the PUT itself is content-type agnostic, so the upload never fails on a header mismatch.',
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  @IsNotEmpty()
  @IsString()
  fileType!: string;
}

export class UploadUrlResponseDto {
  @ApiProperty({
    description:
      'Presigned S3 URL. Send the raw file bytes with a plain HTTP PUT to this URL — no Content-Type or auth headers are required (the signature is in the URL). Then call the feature endpoint with the s3Key below.',
    example: 'https://bucket.s3.us-east-1.amazonaws.com/org_x/uploads/...?X-Amz-Signature=...',
  })
  uploadUrl!: string;

  @ApiProperty({
    description:
      'The S3 key the file will land at. Pass this to the feature endpoint (e.g. questionnaire upload-and-parse) instead of base64 file data.',
    example: 'org_abc/uploads/questionnaire/1735000000-questionnaire.xlsx',
  })
  s3Key!: string;

  @ApiProperty({
    description: 'Seconds until the presigned URL expires.',
    example: 900,
  })
  expiresIn!: number;
}

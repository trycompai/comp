import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { TrustFramework } from '@prisma/client';

export class ComplianceResourceBaseDto {
  @ApiProperty({
    description: 'Organization ID that owns the compliance resource',
    example: 'org_6914cd0e16e4c7dccbb54426',
  })
  @IsString()
  organizationId!: string;

  @ApiProperty({
    description: 'Compliance framework identifier',
    enum: TrustFramework,
    example: TrustFramework.iso_27001,
  })
  @IsEnum(TrustFramework)
  framework!: TrustFramework;
}

export class UploadComplianceResourceDto extends ComplianceResourceBaseDto {
  @ApiProperty({
    description: 'Original file name (PDF only)',
    example: 'iso-27001-certificate.pdf',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  fileType!: string;

  @ApiProperty({
    description: 'Base64 encoded PDF content',
  })
  @IsString()
  fileData!: string;
}

export class ComplianceResourceSignedUrlDto extends ComplianceResourceBaseDto {}

export class ComplianceResourceResponseDto {
  @ApiProperty({ enum: TrustFramework })
  framework!: TrustFramework;

  @ApiProperty()
  fileName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize!: number;

  @ApiProperty({
    description: 'ISO timestamp when the certificate was last updated',
  })
  updatedAt!: string;
}

export class ComplianceResourceUrlResponseDto {
  @ApiProperty()
  signedUrl!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize!: number;
}

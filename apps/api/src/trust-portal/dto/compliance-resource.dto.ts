import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TrustFramework } from '@db';

export class ComplianceResourceBaseDto {
  @ApiProperty({
    description: 'Organization ID that owns the compliance resource',
    example: 'org_6914cd0e16e4c7dccbb54426',
  })
  @IsString()
  organizationId!: string;

  // A compliance certificate targets EITHER a native framework OR a custom
  // framework. Exactly one of `framework` / `customFrameworkId` must be set;
  // the service enforces this (assertExactlyOneFrameworkRef).
  @ApiPropertyOptional({
    description: 'Native compliance framework identifier',
    enum: TrustFramework,
    example: TrustFramework.iso_27001,
  })
  @IsOptional()
  @IsEnum(TrustFramework)
  framework?: TrustFramework;

  @ApiPropertyOptional({
    description:
      'Org-authored custom framework ID (alternative to `framework`)',
    example: 'cfrm_6914cd0e16e4c7dccbb54426',
  })
  @IsOptional()
  @IsString()
  customFrameworkId?: string;
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
  @ApiPropertyOptional({
    enum: TrustFramework,
    description: 'Set for native-framework certificates; null for custom ones',
    nullable: true,
  })
  framework!: TrustFramework | null;

  @ApiPropertyOptional({
    description: 'Set for custom-framework certificates; null for native ones',
    nullable: true,
  })
  customFrameworkId!: string | null;

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

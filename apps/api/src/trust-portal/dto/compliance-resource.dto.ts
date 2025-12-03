import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export const TRUST_COMPLIANCE_FRAMEWORK_ENUM = {
  iso_27001: 'iso_27001',
  iso_42001: 'iso_42001',
  gdpr: 'gdpr',
  hipaa: 'hipaa',
  soc2_type1: 'soc2_type1',
  soc2_type2: 'soc2_type2',
  pci_dss: 'pci_dss',
  nen_7510: 'nen_7510',
  iso_9001: 'iso_9001',
} as const;

export type TrustComplianceFramework =
  (typeof TRUST_COMPLIANCE_FRAMEWORK_ENUM)[keyof typeof TRUST_COMPLIANCE_FRAMEWORK_ENUM];

export class ComplianceResourceBaseDto {
  @ApiProperty({
    description: 'Organization ID that owns the compliance resource',
    example: 'org_6914cd0e16e4c7dccbb54426',
  })
  @IsString()
  organizationId!: string;

  @ApiProperty({
    description: 'Compliance framework identifier',
    enum: TRUST_COMPLIANCE_FRAMEWORK_ENUM,
    example: TRUST_COMPLIANCE_FRAMEWORK_ENUM.iso_27001,
  })
  @IsEnum(TRUST_COMPLIANCE_FRAMEWORK_ENUM)
  framework!: TrustComplianceFramework;
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
  @ApiProperty({ enum: TRUST_COMPLIANCE_FRAMEWORK_ENUM })
  framework!: TrustComplianceFramework;

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

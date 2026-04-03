import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class TriggerVendorRiskAssessmentVendorDto {
  @ApiProperty({ description: 'Vendor ID', example: 'vnd_abc123' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'Vendor name', example: 'CloudTech Solutions' })
  @IsString()
  vendorName: string;

  @ApiProperty({
    description: 'Vendor website (optional)',
    required: false,
    example: 'https://cloudtechsolutions.com',
  })
  @IsOptional()
  @IsUrl()
  vendorWebsite?: string | null;
}

export class TriggerSingleVendorRiskAssessmentDto {
  @ApiProperty({ description: 'Organization ID (deprecated — use auth context)', example: 'org_abc123', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Vendor ID', example: 'vnd_abc123' })
  @IsString()
  vendorId: string;

  @ApiProperty({ description: 'Vendor name', example: 'CloudTech Solutions' })
  @IsString()
  vendorName: string;

  @ApiProperty({
    description: 'Vendor website',
    example: 'https://cloudtechsolutions.com',
  })
  @IsString()
  vendorWebsite: string;

  @ApiProperty({
    description: 'User ID who triggered the assessment (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  createdByUserId?: string | null;
}

export class TriggerVendorRiskAssessmentBatchDto {
  @ApiProperty({ description: 'Organization ID (deprecated — use auth context)', example: 'org_abc123', required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description:
      'If false, skips Firecrawl research (cheaper). Defaults to true.',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  withResearch?: boolean;

  @ApiProperty({
    description: 'Vendors to trigger risk assessment for',
    type: [TriggerVendorRiskAssessmentVendorDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TriggerVendorRiskAssessmentVendorDto)
  vendors: TriggerVendorRiskAssessmentVendorDto[];
}

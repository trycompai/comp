import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';
import {
  VendorCategory,
  VendorStatus,
  Likelihood,
  Impact,
} from '@trycompai/db';

export class CreateVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'CloudTech Solutions Inc.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Detailed description of the vendor and services provided',
    example:
      'Cloud infrastructure provider offering AWS-like services including compute, storage, and networking solutions for enterprise customers.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Vendor category',
    enum: VendorCategory,
    default: VendorCategory.other,
    example: VendorCategory.cloud,
  })
  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @ApiProperty({
    description: 'Assessment status of the vendor',
    enum: VendorStatus,
    default: VendorStatus.not_assessed,
    example: VendorStatus.not_assessed,
  })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiProperty({
    description: 'Inherent probability of risk before controls',
    enum: Likelihood,
    default: Likelihood.very_unlikely,
    example: Likelihood.possible,
  })
  @IsOptional()
  @IsEnum(Likelihood)
  inherentProbability?: Likelihood;

  @ApiProperty({
    description: 'Inherent impact of risk before controls',
    enum: Impact,
    default: Impact.insignificant,
    example: Impact.moderate,
  })
  @IsOptional()
  @IsEnum(Impact)
  inherentImpact?: Impact;

  @ApiProperty({
    description: 'Residual probability after controls are applied',
    enum: Likelihood,
    default: Likelihood.very_unlikely,
    example: Likelihood.unlikely,
  })
  @IsOptional()
  @IsEnum(Likelihood)
  residualProbability?: Likelihood;

  @ApiProperty({
    description: 'Residual impact after controls are applied',
    enum: Impact,
    default: Impact.insignificant,
    example: Impact.minor,
  })
  @IsOptional()
  @IsEnum(Impact)
  residualImpact?: Impact;

  @ApiProperty({
    description: 'Vendor website URL',
    required: false,
    example: 'https://www.cloudtechsolutions.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'ID of the user assigned to manage this vendor',
    required: false,
    example: 'mem_abc123def456',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

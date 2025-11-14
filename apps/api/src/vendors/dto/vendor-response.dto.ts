import { ApiProperty } from '@nestjs/swagger';
import {
  VendorCategory,
  VendorStatus,
  Likelihood,
  Impact,
} from '@trycompai/db';

export class VendorResponseDto {
  @ApiProperty({
    description: 'Vendor ID',
    example: 'vnd_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Vendor name',
    example: 'CloudTech Solutions Inc.',
  })
  name: string;

  @ApiProperty({
    description: 'Detailed description of the vendor and services provided',
    example:
      'Cloud infrastructure provider offering AWS-like services including compute, storage, and networking solutions for enterprise customers.',
  })
  description: string;

  @ApiProperty({
    description: 'Vendor category',
    enum: VendorCategory,
    example: VendorCategory.cloud,
  })
  category: VendorCategory;

  @ApiProperty({
    description: 'Assessment status of the vendor',
    enum: VendorStatus,
    example: VendorStatus.not_assessed,
  })
  status: VendorStatus;

  @ApiProperty({
    description: 'Inherent probability of risk before controls',
    enum: Likelihood,
    example: Likelihood.possible,
  })
  inherentProbability: Likelihood;

  @ApiProperty({
    description: 'Inherent impact of risk before controls',
    enum: Impact,
    example: Impact.moderate,
  })
  inherentImpact: Impact;

  @ApiProperty({
    description: 'Residual probability after controls are applied',
    enum: Likelihood,
    example: Likelihood.unlikely,
  })
  residualProbability: Likelihood;

  @ApiProperty({
    description: 'Residual impact after controls are applied',
    enum: Impact,
    example: Impact.minor,
  })
  residualImpact: Impact;

  @ApiProperty({
    description: 'Vendor website URL',
    nullable: true,
    example: 'https://www.cloudtechsolutions.com',
  })
  website: string | null;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_abc123def456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'ID of the user assigned to manage this vendor',
    nullable: true,
    example: 'mem_abc123def456',
  })
  assigneeId: string | null;

  @ApiProperty({
    description: 'When the vendor was created',
    type: String,
    format: 'date-time',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the vendor was last updated',
    type: String,
    format: 'date-time',
    example: '2024-01-16T14:45:00Z',
  })
  updatedAt: Date;
}

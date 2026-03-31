import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  VendorCategory,
  VendorStatus,
  Likelihood,
  Impact,
} from '@trycompai/db';

/**
 * DTO for PATCH /vendors/:id
 *
 * Defined explicitly rather than using PartialType(CreateVendorDto) because
 * PartialType preserves @IsNotEmpty() — which rejects empty strings even
 * when @IsOptional() is added. For PATCH, empty-string fields like
 * `description: ""` (common for vendors created during onboarding) should
 * not cause a 400.
 */
export class UpdateVendorDto {
  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Vendor description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Vendor category', enum: VendorCategory })
  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @ApiPropertyOptional({ description: 'Assessment status', enum: VendorStatus })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiPropertyOptional({ description: 'Inherent probability', enum: Likelihood })
  @IsOptional()
  @IsEnum(Likelihood)
  inherentProbability?: Likelihood;

  @ApiPropertyOptional({ description: 'Inherent impact', enum: Impact })
  @IsOptional()
  @IsEnum(Impact)
  inherentImpact?: Impact;

  @ApiPropertyOptional({ description: 'Residual probability', enum: Likelihood })
  @IsOptional()
  @IsEnum(Likelihood)
  residualProbability?: Likelihood;

  @ApiPropertyOptional({ description: 'Residual impact', enum: Impact })
  @IsOptional()
  @IsEnum(Impact)
  residualImpact?: Impact;

  @ApiPropertyOptional({ description: 'Vendor website URL' })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => (value === '' ? undefined : value))
  website?: string;

  @ApiPropertyOptional({ description: 'Whether the vendor is a sub-processor' })
  @IsOptional()
  @IsBoolean()
  isSubProcessor?: boolean;

  @ApiPropertyOptional({ description: 'Assignee member ID' })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}

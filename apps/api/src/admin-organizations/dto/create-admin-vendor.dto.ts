import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VendorCategory, VendorStatus } from '@trycompai/db';

export class CreateAdminVendorDto {
  @ApiProperty({
    description: 'Vendor name',
    example: 'CloudTech Solutions',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the vendor and services',
    example: 'Cloud infrastructure provider for compute and storage',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Vendor category',
    enum: VendorCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(VendorCategory)
  category?: VendorCategory;

  @ApiProperty({
    description: 'Assessment status',
    enum: VendorStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiProperty({
    description: 'Vendor website URL',
    required: false,
    example: 'https://example.com',
  })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }) => (value === '' ? undefined : value))
  website?: string;
}

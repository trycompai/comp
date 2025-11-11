import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAccessRequestDto {
  @ApiProperty({ description: 'Full name of the requester' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Email address of the requester' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Company name of the requester' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ description: 'Job title of the requester' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Purpose for requesting access' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({
    description: 'Requested access duration in days',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  requestedDurationDays?: number;

  @ApiProperty({
    description: 'List of requested reports/data types',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  requestedScopes: string[];
}

export class ApproveAccessRequestDto {
  @ApiPropertyOptional({
    description: 'Access duration in days (overrides requested)',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiPropertyOptional({
    description: 'Access scopes',
    type: [String],
  })
  @IsOptional()
  scopes?: string[];
}

export class DenyAccessRequestDto {
  @ApiProperty({ description: 'Reason for denial' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RevokeGrantDto {
  @ApiProperty({ description: 'Reason for revocation' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export enum AccessRequestStatusFilter {
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
  CANCELED = 'canceled',
}

export class ListAccessRequestsDto {
  @ApiPropertyOptional({ enum: AccessRequestStatusFilter })
  @IsEnum(AccessRequestStatusFilter)
  @IsOptional()
  status?: AccessRequestStatusFilter;
}

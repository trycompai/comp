import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  requestedDurationDays?: number;
}

export class ApproveAccessRequestDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;
}

export class DenyAccessRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RevokeGrantDto {
  @ApiProperty()
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

export class ReclaimAccessDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class MarkExceptionDto {
  @ApiProperty({
    description: 'Documentation for why this finding does not apply or is being accepted. Minimum 20 non-whitespace characters.',
    example: 'Bucket hosts intentionally public marketing assets; writes restricted to the marketing IAM role.',
  })
  @IsString()
  @MinLength(20, { message: 'Reason must be at least 20 characters.' })
  // @MinLength alone counts whitespace, so 20 spaces would pass. Require
  // at least 20 non-whitespace characters anywhere in the string.
  @Matches(/(?:\S.*?){20}/s, {
    message: 'Reason must contain at least 20 non-whitespace characters.',
  })
  reason!: string;

  @ApiPropertyOptional({
    description: 'Free-text reviewer or approval reference.',
    example: 'Approved by CISO 2026-Q1',
  })
  @IsOptional()
  @IsString()
  reviewedBy?: string;

  @ApiPropertyOptional({
    description: 'ISO date when this exception should auto-expire. Null/missing = never.',
    example: '2026-08-13',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

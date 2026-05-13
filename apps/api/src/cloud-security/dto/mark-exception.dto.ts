import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class MarkExceptionDto {
  @ApiProperty({
    description: 'Documentation for why this finding does not apply or is being accepted. Minimum 20 characters.',
    example: 'Bucket hosts intentionally public marketing assets; writes restricted to the marketing IAM role.',
  })
  @IsString()
  @MinLength(20, { message: 'Reason must be at least 20 characters.' })
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

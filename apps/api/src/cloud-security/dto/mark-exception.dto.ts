import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MinNonWhitespaceLength } from '../validators/min-non-whitespace-length.validator';

/**
 * Most characters one exception reason may carry.
 *
 * Not the ReDoS mitigation: class-validator runs every decorator on the
 * property, so the count below still scans the whole string. That count is
 * linear; this bounds how much there is to count and store.
 */
export const MAX_EXCEPTION_REASON_LENGTH = 10_000;

export class MarkExceptionDto {
  @ApiProperty({
    description:
      'Documentation for why this finding does not apply or is being accepted. Minimum 20 non-whitespace characters.',
    example:
      'Bucket hosts intentionally public marketing assets; writes restricted to the marketing IAM role.',
    maxLength: MAX_EXCEPTION_REASON_LENGTH,
  })
  @IsString()
  // Redundant with the count below, which already implies a length of at least
  // 20. Kept because it rejects a short reason with a clearer message and costs
  // only a length read.
  @MinLength(20, { message: 'Reason must be at least 20 characters.' })
  @MaxLength(MAX_EXCEPTION_REASON_LENGTH, {
    message: `Reason must be at most ${MAX_EXCEPTION_REASON_LENGTH} characters.`,
  })
  // @MinLength alone counts whitespace, so 20 spaces would pass. Require
  // at least 20 non-whitespace characters anywhere in the string.
  @MinNonWhitespaceLength(20, {
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
    description:
      'ISO date when this exception should auto-expire. Null/missing = never.',
    example: '2026-08-13',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

import { BadRequestException } from '@nestjs/common';

/**
 * Parse an optional ISO date string from a register DTO into a Prisma-friendly
 * value using the three-state convention shared by the ISMS services:
 *   undefined → leave the column as-is (field omitted)
 *   null / empty / whitespace → clear the column
 *   a valid date string → the parsed Date
 * Throws BadRequestException on an unparseable non-empty value.
 */
export function parseOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (!value || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  return date;
}

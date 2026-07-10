import { BadRequestException } from '@nestjs/common';

/** Date-only inputs from the UI's <input type="date"> — strict YYYY-MM-DD. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse an optional date-only string (YYYY-MM-DD) from a register DTO into a
 * Prisma-friendly value, using the three-state convention shared by the ISMS
 * services:
 *   undefined → leave the column as-is (field omitted)
 *   null / empty / whitespace → clear the column
 *   a valid YYYY-MM-DD string → the parsed Date (UTC midnight)
 *
 * Validation is strict: the format must be YYYY-MM-DD AND the parsed value must
 * round-trip to the same string, so `new Date`'s permissive parsing can't accept
 * ambiguous input (e.g. "2026-02-30" rolling to March, or partial strings).
 * Throws BadRequestException otherwise.
 */
export function parseOptionalDate(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!DATE_ONLY.test(trimmed)) {
    throw new BadRequestException('Invalid date; expected format YYYY-MM-DD');
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
    throw new BadRequestException('Invalid date; expected a real calendar date');
  }
  return date;
}

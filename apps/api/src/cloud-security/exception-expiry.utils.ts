import { BadRequestException } from '@nestjs/common';

/**
 * Convert a user-supplied exception expiry into a Date.
 *
 * - `null` / `undefined` / empty string → null (no expiry).
 * - Bare `YYYY-MM-DD` → end of that calendar day in UTC, so the
 *   exception persists through the user's chosen calendar day in any
 *   reasonable time zone. Naive `new Date("2026-08-13")` would parse as
 *   the START of Aug 13 UTC — already in the past by late evening Aug 12
 *   in US Pacific, expiring the exception ~8h before the user expected.
 * - Full ISO timestamp → used as-is.
 *
 * Throws BadRequestException for:
 * - Format that's neither bare-date nor parseable as ISO
 * - Bare-date with invalid calendar components (e.g. `2026-02-30`)
 *   — JavaScript's Date constructor silently rolls these over to a later
 *   day, which would surprise the user.
 */
export function parseExceptionExpiry(
  input: string | null | undefined,
): Date | null {
  if (!input) return null;

  const bareDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (bareDate) {
    const [, yStr, mStr, dStr] = bareDate;
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    // Reject impossible calendar dates BEFORE constructing the Date —
    // otherwise Feb 30 silently becomes Mar 2, etc.
    const candidate = new Date(Date.UTC(y, m - 1, d));
    if (
      candidate.getUTCFullYear() !== y ||
      candidate.getUTCMonth() !== m - 1 ||
      candidate.getUTCDate() !== d
    ) {
      throw new BadRequestException(
        'expiresAt must be a valid calendar date.',
      );
    }
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }

  // Reject anything that isn't strict ISO 8601 — `new Date()` happily parses
  // locale-specific strings like "January 1, 2026" and "2026/08/13", which
  // would silently bypass the documented contract.
  const ISO_8601 =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
  if (!ISO_8601.test(input)) {
    throw new BadRequestException(
      'expiresAt must be a valid ISO date or YYYY-MM-DD calendar date.',
    );
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(
      'expiresAt must be a valid ISO date or YYYY-MM-DD calendar date.',
    );
  }
  return parsed;
}

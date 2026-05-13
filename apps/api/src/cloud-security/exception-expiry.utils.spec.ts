import { BadRequestException } from '@nestjs/common';
import { parseExceptionExpiry } from './exception-expiry.utils';

describe('parseExceptionExpiry', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(parseExceptionExpiry(null)).toBeNull();
    expect(parseExceptionExpiry(undefined)).toBeNull();
    expect(parseExceptionExpiry('')).toBeNull();
  });

  it('expands a bare YYYY-MM-DD to end of that day in UTC', () => {
    const d = parseExceptionExpiry('2026-08-13');
    expect(d).toEqual(new Date(Date.UTC(2026, 7, 13, 23, 59, 59, 999)));
  });

  it('passes through a full ISO timestamp unchanged', () => {
    const d = parseExceptionExpiry('2026-08-13T14:30:00.000Z');
    expect(d).toEqual(new Date('2026-08-13T14:30:00.000Z'));
  });

  it('rejects YYYY-MM-DD with invalid calendar dates (no silent rollover)', () => {
    // Feb 30 doesn't exist — JavaScript's Date constructor would roll it
    // forward to March 2. We must reject so the user gets an error instead
    // of an exception expiring a couple days later than they meant.
    expect(() => parseExceptionExpiry('2026-02-30')).toThrow(
      BadRequestException,
    );
    // Month 13 also impossible.
    expect(() => parseExceptionExpiry('2026-13-01')).toThrow(
      BadRequestException,
    );
    // Day 32.
    expect(() => parseExceptionExpiry('2026-01-32')).toThrow(
      BadRequestException,
    );
    // Day 0.
    expect(() => parseExceptionExpiry('2026-01-00')).toThrow(
      BadRequestException,
    );
  });

  it('accepts leap-day dates that are valid', () => {
    // 2024 was a leap year — Feb 29 is real.
    expect(parseExceptionExpiry('2024-02-29')).toEqual(
      new Date(Date.UTC(2024, 1, 29, 23, 59, 59, 999)),
    );
  });

  it('rejects leap-day dates in non-leap years', () => {
    // 2026 is NOT a leap year. Feb 29 doesn't exist.
    expect(() => parseExceptionExpiry('2026-02-29')).toThrow(
      BadRequestException,
    );
  });

  it('rejects truly unparseable strings', () => {
    expect(() => parseExceptionExpiry('not a date')).toThrow(
      BadRequestException,
    );
    expect(() => parseExceptionExpiry('xyz')).toThrow(BadRequestException);
  });

  it('accepts non-canonical-but-parseable date forms via the fallback', () => {
    // Slash-separated form is non-canonical but `new Date()` parses it on
    // most engines — we don't reject these. Calendar validation only kicks
    // in for bare `YYYY-MM-DD` (the canonical form the picker emits).
    expect(parseExceptionExpiry('2026/08/13')).not.toBeNull();
  });
});

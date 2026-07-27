import { BadRequestException } from '@nestjs/common';
import { parseOptionalDate } from './parse-optional-date';

describe('parseOptionalDate', () => {
  it('passes undefined through (leave column as-is)', () => {
    expect(parseOptionalDate(undefined)).toBeUndefined();
  });

  it('clears on null / empty / whitespace', () => {
    expect(parseOptionalDate(null)).toBeNull();
    expect(parseOptionalDate('')).toBeNull();
    expect(parseOptionalDate('   ')).toBeNull();
  });

  it('parses a valid YYYY-MM-DD to UTC midnight', () => {
    const date = parseOptionalDate('2026-05-26');
    expect(date).toBeInstanceOf(Date);
    expect((date as Date).toISOString()).toBe('2026-05-26T00:00:00.000Z');
  });

  it('rejects non-ISO / ambiguous formats', () => {
    for (const bad of ['26-05-2026', '05/26/2026', '2026-5-6', '2026', 'garbage']) {
      expect(() => parseOptionalDate(bad)).toThrow(BadRequestException);
    }
  });

  it('rejects a well-formatted but non-existent calendar date (no silent rollover)', () => {
    expect(() => parseOptionalDate('2026-02-30')).toThrow(BadRequestException);
    expect(() => parseOptionalDate('2026-13-01')).toThrow(BadRequestException);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { loadColumnWidths, sanitizeWidths, saveColumnWidths } from './column-widths-cookie';

describe('sanitizeWidths', () => {
  it('keeps finite positive numbers (rounded) and drops everything else', () => {
    expect(
      sanitizeWidths({
        a: 100,
        b: 12.7,
        c: -5,
        d: 0,
        e: Number.NaN,
        f: Number.POSITIVE_INFINITY,
        g: 'x',
        h: null,
      }),
    ).toEqual({ a: 100, b: 13 });
  });

  it('returns {} for non-objects', () => {
    expect(sanitizeWidths(null)).toEqual({});
    expect(sanitizeWidths('nope')).toEqual({});
    expect(sanitizeWidths(42)).toEqual({});
  });
});

describe('column width cookie round-trip', () => {
  beforeEach(() => {
    document.cookie = 'fwk-test-cols=; path=/; max-age=0';
  });

  it('saves and loads widths', () => {
    saveColumnWidths('fwk-test-cols', { name: 200, version: 80 });
    expect(loadColumnWidths('fwk-test-cols')).toEqual({ name: 200, version: 80 });
  });

  it('drops malformed widths on save', () => {
    saveColumnWidths('fwk-test-cols', { name: 200, bad: -10, worse: Number.NaN } as Record<
      string,
      number
    >);
    expect(loadColumnWidths('fwk-test-cols')).toEqual({ name: 200 });
  });

  it('returns {} when there is no cookie', () => {
    expect(loadColumnWidths('fwk-missing-cookie')).toEqual({});
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  STALE_DEVICE_THRESHOLD_DAYS,
  daysSinceCheckIn,
  getDeviceComplianceStatus,
  isDeviceStale,
} from './devices';

// Fri 2026-04-17 12:00:00 UTC — a fixed "now" for deterministic math.
const FIXED_NOW = new Date('2026-04-17T12:00:00.000Z');

const originalDateNow = Date.now;

beforeEach(() => {
  Date.now = () => FIXED_NOW.getTime();
});

afterEach(() => {
  Date.now = originalDateNow;
});

function daysAgo(days: number): Date {
  return new Date(FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

describe('STALE_DEVICE_THRESHOLD_DAYS', () => {
  it('is 7 days', () => {
    expect(STALE_DEVICE_THRESHOLD_DAYS).toBe(7);
  });
});

describe('daysSinceCheckIn', () => {
  it('returns null when lastCheckIn is null', () => {
    expect(daysSinceCheckIn(null)).toBeNull();
  });

  it('returns 0 for just now', () => {
    expect(daysSinceCheckIn(FIXED_NOW)).toBe(0);
  });

  it('returns whole days (floored) for past timestamps', () => {
    expect(daysSinceCheckIn(daysAgo(1))).toBe(1);
    expect(daysSinceCheckIn(daysAgo(6))).toBe(6);
    expect(daysSinceCheckIn(daysAgo(7))).toBe(7);
    expect(daysSinceCheckIn(daysAgo(51))).toBe(51);
  });

  it('accepts ISO strings', () => {
    expect(daysSinceCheckIn(daysAgo(3).toISOString())).toBe(3);
  });

  it('returns null for invalid date strings', () => {
    expect(daysSinceCheckIn('not-a-date')).toBeNull();
    expect(daysSinceCheckIn('')).toBeNull();
  });
});

describe('isDeviceStale', () => {
  it('treats never-synced devices as stale', () => {
    expect(isDeviceStale(null)).toBe(true);
  });

  it('is false for a check-in 6 days ago', () => {
    expect(isDeviceStale(daysAgo(6))).toBe(false);
  });

  it('is true exactly at the 7-day boundary', () => {
    expect(isDeviceStale(daysAgo(7))).toBe(true);
  });

  it('is true for a check-in 51 days ago', () => {
    expect(isDeviceStale(daysAgo(51))).toBe(true);
  });

  it('treats invalid date strings as stale', () => {
    expect(isDeviceStale('not-a-date')).toBe(true);
  });
});

describe('getDeviceComplianceStatus', () => {
  it('returns "stale" regardless of isCompliant when never synced', () => {
    expect(getDeviceComplianceStatus({ isCompliant: true, lastCheckIn: null })).toBe('stale');
    expect(getDeviceComplianceStatus({ isCompliant: false, lastCheckIn: null })).toBe('stale');
  });

  it('returns "stale" regardless of isCompliant when beyond threshold', () => {
    expect(getDeviceComplianceStatus({ isCompliant: true, lastCheckIn: daysAgo(8) })).toBe('stale');
    expect(getDeviceComplianceStatus({ isCompliant: false, lastCheckIn: daysAgo(51) })).toBe(
      'stale',
    );
  });

  it('returns "compliant" for fresh + isCompliant true', () => {
    expect(getDeviceComplianceStatus({ isCompliant: true, lastCheckIn: daysAgo(1) })).toBe(
      'compliant',
    );
  });

  it('returns "non_compliant" for fresh + isCompliant false', () => {
    expect(getDeviceComplianceStatus({ isCompliant: false, lastCheckIn: daysAgo(1) })).toBe(
      'non_compliant',
    );
  });

  it('honors the 7-day boundary: day 6 fresh, day 7 stale', () => {
    expect(getDeviceComplianceStatus({ isCompliant: true, lastCheckIn: daysAgo(6) })).toBe(
      'compliant',
    );
    expect(getDeviceComplianceStatus({ isCompliant: true, lastCheckIn: daysAgo(7) })).toBe('stale');
  });

  it('returns "stale" for invalid date strings regardless of isCompliant', () => {
    expect(getDeviceComplianceStatus({ isCompliant: true, lastCheckIn: 'not-a-date' })).toBe(
      'stale',
    );
    expect(getDeviceComplianceStatus({ isCompliant: false, lastCheckIn: 'not-a-date' })).toBe(
      'stale',
    );
  });
});

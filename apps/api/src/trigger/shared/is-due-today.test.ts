import { TaskFrequency } from '@trycompai/db';
import { isDueToday } from './is-due-today';

const atUtc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('isDueToday', () => {
  const now = atUtc('2026-04-24');

  describe('daily', () => {
    it('returns true when lastRunAt is null', () => {
      expect(isDueToday({ scheduleFrequency: TaskFrequency.daily, lastRunAt: null, now })).toBe(true);
    });
    it('returns true even when it ran today', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.daily, lastRunAt: atUtc('2026-04-24'), now }),
      ).toBe(true);
    });
  });

  describe('weekly', () => {
    it('returns true when lastRunAt is null', () => {
      expect(isDueToday({ scheduleFrequency: TaskFrequency.weekly, lastRunAt: null, now })).toBe(true);
    });
    it('returns false when lastRunAt is 6 days ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.weekly, lastRunAt: atUtc('2026-04-18'), now }),
      ).toBe(false);
    });
    it('returns true when lastRunAt is exactly 7 days ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.weekly, lastRunAt: atUtc('2026-04-17'), now }),
      ).toBe(true);
    });
    it('returns true when lastRunAt is 14 days ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.weekly, lastRunAt: atUtc('2026-04-10'), now }),
      ).toBe(true);
    });
  });

  describe('monthly', () => {
    it('returns false when lastRunAt is 29 days ago but same calendar month', () => {
      // 2026-03-26 → 2026-04-24 is 29 days, crosses a month boundary; should be true
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.monthly, lastRunAt: atUtc('2026-03-26'), now }),
      ).toBe(true);
    });
    it('returns false when lastRunAt is same calendar month', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.monthly, lastRunAt: atUtc('2026-04-01'), now }),
      ).toBe(false);
    });
    it('returns true when lastRunAt is null', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.monthly, lastRunAt: null, now }),
      ).toBe(true);
    });
  });

  describe('quarterly', () => {
    it('returns false when lastRunAt is 2 months ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.quarterly, lastRunAt: atUtc('2026-02-24'), now }),
      ).toBe(false);
    });
    it('returns true when lastRunAt is 3 months ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.quarterly, lastRunAt: atUtc('2026-01-24'), now }),
      ).toBe(true);
    });
  });

  describe('yearly', () => {
    it('returns false when lastRunAt is 11 months ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.yearly, lastRunAt: atUtc('2025-05-24'), now }),
      ).toBe(false);
    });
    it('returns true when lastRunAt is 12 months ago', () => {
      expect(
        isDueToday({ scheduleFrequency: TaskFrequency.yearly, lastRunAt: atUtc('2025-04-24'), now }),
      ).toBe(true);
    });
  });
});

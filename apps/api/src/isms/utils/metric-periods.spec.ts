import {
  addPeriods,
  anchorPeriod,
  isAlignedPeriodStart,
  isMetricOverdue,
  listMissingPeriods,
  periodLabel,
  periodStartFor,
  toPeriodKey,
} from './metric-periods';

describe('toPeriodKey', () => {
  it('normalizes Dates and ISO strings to YYYY-MM-DD', () => {
    expect(toPeriodKey(new Date('2026-07-15T10:30:00Z'))).toBe('2026-07-15');
    expect(toPeriodKey('2026-07-01')).toBe('2026-07-01');
    expect(toPeriodKey('2026-07-01T00:00:00.000Z')).toBe('2026-07-01');
  });

  it('rejects garbage and impossible dates', () => {
    expect(toPeriodKey('not-a-date')).toBeNull();
    expect(toPeriodKey('2026-02-30')).toBeNull();
    expect(toPeriodKey('2026-13-01')).toBeNull();
  });
});

describe('periodStartFor', () => {
  it('returns the first of the month for monthly cadence', () => {
    expect(periodStartFor('monthly', new Date('2026-07-20T12:00:00Z'))).toBe(
      '2026-07-01',
    );
  });

  it('returns the first of the quarter for quarterly cadence', () => {
    expect(periodStartFor('quarterly', new Date('2026-08-20T12:00:00Z'))).toBe(
      '2026-07-01',
    );
    expect(periodStartFor('quarterly', new Date('2026-03-01T00:00:00Z'))).toBe(
      '2026-01-01',
    );
  });
});

describe('isAlignedPeriodStart', () => {
  it('accepts first-of-month for monthly', () => {
    expect(isAlignedPeriodStart('monthly', '2026-07-01')).toBe(true);
    expect(isAlignedPeriodStart('monthly', '2026-07-02')).toBe(false);
  });

  it('accepts only quarter starts for quarterly', () => {
    expect(isAlignedPeriodStart('quarterly', '2026-07-01')).toBe(true);
    expect(isAlignedPeriodStart('quarterly', '2026-08-01')).toBe(false);
  });
});

describe('addPeriods and periodLabel', () => {
  it('steps by month and quarter, across year boundaries', () => {
    expect(addPeriods('monthly', '2026-01-01', -1)).toBe('2025-12-01');
    expect(addPeriods('quarterly', '2026-01-01', -1)).toBe('2025-10-01');
    expect(addPeriods('quarterly', '2026-10-01', 1)).toBe('2027-01-01');
  });

  it('labels periods for humans', () => {
    expect(periodLabel('monthly', '2026-07-01')).toBe('July 2026');
    expect(periodLabel('quarterly', '2026-07-01')).toBe('Q3 2026');
  });
});

describe('listMissingPeriods', () => {
  const now = new Date('2026-07-20T12:00:00Z');

  it('lists every unmeasured period from anchor through the current period, newest first', () => {
    expect(
      listMissingPeriods({
        cadence: 'monthly',
        anchor: '2026-04-01',
        measured: new Set(['2026-05-01']),
        now,
      }),
    ).toEqual(['2026-07-01', '2026-06-01', '2026-04-01']);
  });

  it('returns only the current period for a brand-new metric', () => {
    expect(
      listMissingPeriods({
        cadence: 'monthly',
        anchor: '2026-07-01',
        measured: new Set(),
        now,
      }),
    ).toEqual(['2026-07-01']);
  });

  it('caps the walk so a years-idle metric stays bounded', () => {
    const missing = listMissingPeriods({
      cadence: 'monthly',
      anchor: '2010-01-01',
      measured: new Set(),
      now,
      cap: 12,
    });
    expect(missing).toHaveLength(12);
    expect(missing[0]).toBe('2026-07-01'); // newest kept, oldest dropped
  });
});

describe('anchorPeriod', () => {
  it('uses the creation period when there are no measurements', () => {
    expect(
      anchorPeriod({
        cadence: 'monthly',
        createdAt: new Date('2026-07-10T00:00:00Z'),
        measuredKeys: [],
      }),
    ).toBe('2026-07-01');
  });

  it('extends back to the earliest measurement when older than creation', () => {
    expect(
      anchorPeriod({
        cadence: 'monthly',
        createdAt: new Date('2026-07-10T00:00:00Z'),
        measuredKeys: ['2026-02-01', '2026-06-01'],
      }),
    ).toBe('2026-02-01');
  });
});

describe('isMetricOverdue (CS-723 overdue signal)', () => {
  const now = new Date('2026-07-20T12:00:00Z');

  it('is NOT overdue when the previous period is recorded (within cadence)', () => {
    expect(
      isMetricOverdue({
        cadence: 'monthly',
        latestMeasured: '2026-06-01',
        anchor: '2026-01-01',
        now,
      }),
    ).toBe(false);
  });

  it('is overdue when the latest measurement is older than the previous period', () => {
    expect(
      isMetricOverdue({
        cadence: 'monthly',
        latestMeasured: '2026-05-01',
        anchor: '2026-01-01',
        now,
      }),
    ).toBe(true);
  });

  it('clears when the CURRENT period is entered, even with older gaps (per ticket)', () => {
    expect(
      isMetricOverdue({
        cadence: 'monthly',
        latestMeasured: '2026-07-01',
        anchor: '2026-01-01',
        now,
      }),
    ).toBe(false);
  });

  it('is not overdue for a metric created this period with no measurements', () => {
    expect(
      isMetricOverdue({
        cadence: 'monthly',
        latestMeasured: null,
        anchor: '2026-07-01',
        now,
      }),
    ).toBe(false);
  });

  it('becomes overdue once a full period passes with no measurement at all', () => {
    expect(
      isMetricOverdue({
        cadence: 'monthly',
        latestMeasured: null,
        anchor: '2026-06-01',
        now,
      }),
    ).toBe(true);
  });

  it('respects quarterly cadence', () => {
    // Q2 recorded, now in Q3 → fine; Q1 latest → overdue.
    expect(
      isMetricOverdue({
        cadence: 'quarterly',
        latestMeasured: '2026-04-01',
        anchor: '2026-01-01',
        now,
      }),
    ).toBe(false);
    expect(
      isMetricOverdue({
        cadence: 'quarterly',
        latestMeasured: '2026-01-01',
        anchor: '2025-10-01',
        now,
      }),
    ).toBe(true);
  });
});

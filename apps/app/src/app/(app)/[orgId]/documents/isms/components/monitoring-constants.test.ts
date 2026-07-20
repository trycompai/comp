import { describe, expect, it } from 'vitest';
import type { IsmsMetric } from '../isms-types';
import {
  computeDueEntries,
  metricIsOverdue,
  metricValidationMessages,
} from './monitoring-constants';
import { addPeriods, periodStartFor } from './monitoring-periods';

const NOW = new Date('2026-07-20T12:00:00Z');
const CURRENT = periodStartFor('monthly', NOW); // 2026-07-01

function makeMetric(overrides: Partial<IsmsMetric> = {}): IsmsMetric {
  return {
    id: 'met_1',
    metricKey: 'uptime',
    name: 'Production availability / uptime',
    whatIsMeasured: 'Availability of production services.',
    method: 'Cloud monitoring uptime reports.',
    cadence: 'monthly',
    monitorMemberId: null,
    analyzeMemberId: null,
    target: '≥ 99.9%',
    objectiveId: null,
    objective: null,
    dataSource: 'manual',
    isActive: true,
    source: 'derived',
    derivedFrom: 'seed:uptime',
    position: 0,
    createdAt: '2026-04-10T00:00:00.000Z',
    measurements: [],
    ...overrides,
  };
}

function measurement(periodStart: string, value = '99.9%') {
  return {
    id: `msr_${periodStart}`,
    metricId: 'met_1',
    periodStart,
    value,
    note: null,
    recordedAt: '2026-07-20T10:00:00.000Z',
    enteredById: 'mem_1',
    source: 'manual',
  };
}

describe('metricValidationMessages (client mirror of the 9.1 gate)', () => {
  it('requires at least one active metric', () => {
    expect(metricValidationMessages({ metrics: [] })).toEqual([
      'At least one metric must be active.',
    ]);
    expect(
      metricValidationMessages({
        metrics: [makeMetric({ isActive: false })],
      }),
    ).toEqual(['At least one metric must be active.']);
  });

  it('requires a cadence on every active metric', () => {
    expect(
      metricValidationMessages({
        metrics: [makeMetric({ cadence: null, name: 'Custom A' })],
      }),
    ).toEqual(['"Custom A" needs a cadence.']);
    expect(metricValidationMessages({ metrics: [makeMetric()] })).toEqual([]);
  });
});

describe('metricIsOverdue', () => {
  it('is not overdue when the previous period is recorded', () => {
    const metric = makeMetric({
      measurements: [measurement(addPeriods('monthly', CURRENT, -1))],
    });
    expect(metricIsOverdue(metric, NOW)).toBe(false);
  });

  it('is overdue when the latest measurement is older than the previous period', () => {
    const metric = makeMetric({
      measurements: [measurement(addPeriods('monthly', CURRENT, -3))],
    });
    expect(metricIsOverdue(metric, NOW)).toBe(true);
  });

  it('clears when the current period is entered even with older gaps', () => {
    const metric = makeMetric({
      measurements: [
        measurement(CURRENT),
        measurement(addPeriods('monthly', CURRENT, -4)),
      ],
    });
    expect(metricIsOverdue(metric, NOW)).toBe(false);
  });

  it('never flags inactive metrics or metrics without a cadence', () => {
    expect(metricIsOverdue(makeMetric({ isActive: false }), NOW)).toBe(false);
    expect(metricIsOverdue(makeMetric({ cadence: null }), NOW)).toBe(false);
  });
});

describe('computeDueEntries', () => {
  it('lists the current period and every historical gap, newest first', () => {
    // Created in April, only May measured → due: July (current), gaps: June, April.
    const metric = makeMetric({
      measurements: [measurement(addPeriods('monthly', CURRENT, -2))],
    });
    const entries = computeDueEntries({ metrics: [metric], now: NOW });

    expect(entries.map((entry) => entry.periodKey)).toEqual([
      CURRENT,
      addPeriods('monthly', CURRENT, -1),
      addPeriods('monthly', CURRENT, -3),
    ]);
    expect(entries[0].isCurrentPeriod).toBe(true);
    expect(entries[1].isCurrentPeriod).toBe(false);
    expect(entries[0].periodText).toBe('July 2026');
  });

  it('exposes the most recent value for "Same as last period"', () => {
    const metric = makeMetric({
      measurements: [
        measurement(addPeriods('monthly', CURRENT, -1), '99.95%'),
        measurement(addPeriods('monthly', CURRENT, -2), '99.90%'),
      ],
    });
    const entries = computeDueEntries({ metrics: [metric], now: NOW });
    expect(entries[0].lastValue).toBe('99.95%');
  });

  it('skips inactive metrics and metrics without a cadence', () => {
    const entries = computeDueEntries({
      metrics: [makeMetric({ isActive: false }), makeMetric({ cadence: null })],
      now: NOW,
    });
    expect(entries).toEqual([]);
  });

  it('is empty when every period is recorded', () => {
    const created = periodStartFor('monthly', new Date('2026-06-05T00:00:00Z'));
    const metric = makeMetric({
      createdAt: '2026-06-05T00:00:00.000Z',
      measurements: [measurement(CURRENT), measurement(created)],
    });
    expect(computeDueEntries({ metrics: [metric], now: NOW })).toEqual([]);
  });
});

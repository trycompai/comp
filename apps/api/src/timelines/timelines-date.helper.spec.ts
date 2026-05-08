import { recalculatePhaseDates } from './timelines-date.helper';

interface TestPhase {
  orderIndex: number;
  durationWeeks: number;
  datesPinned: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

describe('recalculatePhaseDates', () => {
  it('calculates sequential dates from start date', () => {
    const phases: TestPhase[] = [
      {
        orderIndex: 0,
        durationWeeks: 8,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
      {
        orderIndex: 1,
        durationWeeks: 4,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
      {
        orderIndex: 2,
        durationWeeks: 2,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
    ];
    const startDate = new Date('2026-01-15');
    const result = recalculatePhaseDates(phases, startDate);

    expect(result[0].startDate).toEqual(new Date('2026-01-15'));
    expect(result[0].endDate).toEqual(new Date('2026-03-12'));
    expect(result[1].startDate).toEqual(new Date('2026-03-12'));
    expect(result[1].endDate).toEqual(new Date('2026-04-09'));
    expect(result[2].startDate).toEqual(new Date('2026-04-09'));
    expect(result[2].endDate).toEqual(new Date('2026-04-23'));
  });

  it('skips pinned phases but uses their endDate for the next phase', () => {
    const phases: TestPhase[] = [
      {
        orderIndex: 0,
        durationWeeks: 8,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
      {
        orderIndex: 1,
        durationWeeks: 4,
        datesPinned: true,
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-04-20'),
      },
      {
        orderIndex: 2,
        durationWeeks: 2,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
    ];
    const startDate = new Date('2026-01-15');
    const result = recalculatePhaseDates(phases, startDate);

    expect(result[0].startDate).toEqual(new Date('2026-01-15'));
    // Phase 1 is pinned -- dates unchanged
    expect(result[1].startDate).toEqual(new Date('2026-03-15'));
    expect(result[1].endDate).toEqual(new Date('2026-04-20'));
    // Phase 2 starts from pinned phase's endDate
    expect(result[2].startDate).toEqual(new Date('2026-04-20'));
    expect(result[2].endDate).toEqual(new Date('2026-05-04'));
  });

  it('handles single phase', () => {
    const phases: TestPhase[] = [
      {
        orderIndex: 0,
        durationWeeks: 8,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
    ];
    const startDate = new Date('2026-01-15');
    const result = recalculatePhaseDates(phases, startDate);

    expect(result).toHaveLength(1);
    expect(result[0].startDate).toEqual(new Date('2026-01-15'));
  });

  it('sorts phases by orderIndex regardless of input order', () => {
    const phases: TestPhase[] = [
      {
        orderIndex: 2,
        durationWeeks: 2,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
      {
        orderIndex: 0,
        durationWeeks: 8,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
      {
        orderIndex: 1,
        durationWeeks: 4,
        datesPinned: false,
        startDate: null,
        endDate: null,
      },
    ];
    const startDate = new Date('2026-01-15');
    const result = recalculatePhaseDates(phases, startDate);

    expect(result[0].orderIndex).toBe(0);
    expect(result[1].orderIndex).toBe(1);
    expect(result[2].orderIndex).toBe(2);
  });
});

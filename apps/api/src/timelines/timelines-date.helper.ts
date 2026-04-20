interface PhaseForRecalculation {
  orderIndex: number;
  durationWeeks: number;
  datesPinned: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

export function recalculatePhaseDates<T extends PhaseForRecalculation>(
  phases: T[],
  timelineStartDate: Date,
): (T & { startDate: Date; endDate: Date })[] {
  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  // Defensively copy the caller's start date so downstream mutation of any
  // returned startDate/endDate can't write back into the input.
  let currentDate = new Date(timelineStartDate);

  return sorted.map((phase) => {
    if (phase.datesPinned && phase.startDate && phase.endDate) {
      // Also defensively copy the pinned dates so the returned objects don't
      // alias the input phase rows.
      const pinnedStart = new Date(phase.startDate);
      const pinnedEnd = new Date(phase.endDate);
      currentDate = new Date(pinnedEnd);
      return { ...phase, startDate: pinnedStart, endDate: pinnedEnd };
    }

    const startDate = new Date(currentDate);
    const endDate = addWeeks(startDate, phase.durationWeeks);
    currentDate = new Date(endDate);

    return { ...phase, startDate, endDate };
  });
}

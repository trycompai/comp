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
  let currentDate = timelineStartDate;

  return sorted.map((phase) => {
    if (phase.datesPinned && phase.startDate && phase.endDate) {
      currentDate = phase.endDate;
      return { ...phase, startDate: phase.startDate, endDate: phase.endDate };
    }

    const startDate = currentDate;
    const endDate = addWeeks(startDate, phase.durationWeeks);
    currentDate = endDate;

    return { ...phase, startDate, endDate };
  });
}

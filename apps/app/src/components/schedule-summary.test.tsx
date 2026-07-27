import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleSummary } from './schedule-summary';

describe('ScheduleSummary', () => {
  it('renders frequency label', () => {
    render(<ScheduleSummary scheduleFrequency="weekly" lastRunAt={null} />);
    expect(screen.getByText(/Weekly/)).toBeInTheDocument();
  });

  it('labels a never-run automation "first run" (cadence starts after it runs)', () => {
    // A never-run automation is due on the next tick for any cadence, so the
    // date is today regardless of daily/weekly — labelled "first run", not
    // "next", so "Runs Weekly · <today>" isn't confusing.
    render(<ScheduleSummary scheduleFrequency="weekly" lastRunAt={null} />);
    expect(screen.getByText(/first run:/)).toBeInTheDocument();
    expect(screen.queryByText(/next:/)).not.toBeInTheDocument();
  });

  it('renders a deterministic YYYY-MM-DD next-run date', () => {
    render(
      <ScheduleSummary
        scheduleFrequency="weekly"
        lastRunAt={new Date('2026-04-17T00:00:00.000Z').toISOString()}
      />,
    );
    // lastRunAt 2026-04-17 + 7 days = 2026-04-24. Tests render the literal
    // locale-agnostic YYYY-MM-DD, not a toLocaleDateString() output.
    expect(screen.getByText(/next: 2026-04-24/)).toBeInTheDocument();
  });
});

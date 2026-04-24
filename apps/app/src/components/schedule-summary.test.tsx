import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScheduleSummary } from './schedule-summary';

describe('ScheduleSummary', () => {
  it('renders frequency label', () => {
    render(<ScheduleSummary scheduleFrequency="weekly" lastRunAt={null} />);
    expect(screen.getByText(/Weekly/)).toBeInTheDocument();
  });

  it('renders a next-run date', () => {
    render(
      <ScheduleSummary
        scheduleFrequency="weekly"
        lastRunAt={new Date('2026-04-17').toISOString()}
      />,
    );
    expect(screen.getByText(/next:/)).toBeInTheDocument();
  });
});

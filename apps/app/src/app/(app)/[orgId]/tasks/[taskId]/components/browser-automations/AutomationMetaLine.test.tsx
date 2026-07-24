import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BrowserAutomationRun } from '../../hooks/types';
import { AutomationMetaLine } from './AutomationMetaLine';

function run(overrides: Partial<BrowserAutomationRun> = {}): BrowserAutomationRun {
  return {
    id: 'r1',
    status: 'completed',
    createdAt: new Date('2026-04-17T00:00:00.000Z').toISOString(),
    ...overrides,
  };
}

describe('AutomationMetaLine', () => {
  it('never run: "First run today · then <cadence>" with no promised date', () => {
    render(<AutomationMetaLine scheduleFrequency="daily" lastRunAt={null} isPaused={false} />);
    expect(screen.getByText(/First run today/)).toBeInTheDocument();
    expect(screen.getByText(/then daily/)).toBeInTheDocument();
    expect(screen.queryByText(/next/)).not.toBeInTheDocument();
    // "Never run" and "first run" said the same thing — the old redundancy is gone.
    expect(screen.queryByText(/Never run/)).not.toBeInTheDocument();
  });

  it('ran ok: "Last ran … · <cadence> · next <date>"', () => {
    render(
      <AutomationMetaLine
        scheduleFrequency="weekly"
        lastRunAt="2026-04-17T00:00:00.000Z"
        latestRun={run()}
        isPaused={false}
      />,
    );
    // weekly + lastRun 2026-04-17 → next Apr 24 (derived from lastRunAt, not now).
    expect(screen.getByText(/Last ran/)).toBeInTheDocument();
    expect(screen.getByText(/weekly · next Apr 24/)).toBeInTheDocument();
  });

  it('failed: leads with a red failure clause, then cadence + next', () => {
    render(
      <AutomationMetaLine
        scheduleFrequency="weekly"
        lastRunAt="2026-04-17T00:00:00.000Z"
        latestRun={run({ status: 'failed' })}
        isPaused={false}
      />,
    );
    const fail = screen.getByText(/Last run failed/);
    expect(fail).toHaveClass('text-destructive');
    expect(screen.getByText(/next Apr 24/)).toBeInTheDocument();
  });

  it('paused: schedule on hold, no dates promised', () => {
    render(
      <AutomationMetaLine scheduleFrequency="monthly" lastRunAt={null} isPaused={true} />,
    );
    expect(screen.getByText('Paused · monthly schedule on hold')).toBeInTheDocument();
    expect(screen.queryByText(/next/)).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The ledger is covered by its own test; here we only assert which run is shown.
vi.mock('./RunStepLedger', () => ({
  RunStepLedger: ({ run, flat }: { run: { id: string }; flat?: boolean }) => (
    <div data-testid="ledger" data-run={run.id} data-flat={String(flat)} />
  ),
}));

import type { BrowserAutomationRun } from '../../hooks/types';
import { RunHistory } from './RunHistory';

function run(
  id: string,
  createdAt: string,
  overrides: Partial<BrowserAutomationRun> = {},
): BrowserAutomationRun {
  return { id, status: 'completed', createdAt, ...overrides };
}

describe('RunHistory', () => {
  it('shows an empty state with no runs', () => {
    render(<RunHistory runs={[]} />);
    expect(screen.getByText('No runs yet')).toBeInTheDocument();
  });

  it('flattens the latest run and shows no "Earlier" strip for a single run', () => {
    render(<RunHistory runs={[run('r1', '2026-07-20T06:02:00Z')]} />);
    const ledger = screen.getByTestId('ledger');
    expect(ledger).toHaveAttribute('data-run', 'r1');
    expect(ledger).toHaveAttribute('data-flat', 'true');
    expect(screen.queryByText('Earlier')).not.toBeInTheDocument();
  });

  it('lets an older run be selected from the "Earlier" strip', () => {
    const runs = [
      run('r1', '2026-07-20T06:02:00Z'),
      run('r2', '2026-07-13T09:30:00Z'),
      run('r3', '2026-07-06T14:15:00Z', { status: 'failed' }),
    ];
    render(<RunHistory runs={runs} />);
    // Latest is flattened by default.
    expect(screen.getByTestId('ledger')).toHaveAttribute('data-run', 'r1');
    expect(screen.getByText('Earlier')).toBeInTheDocument();

    // Clicking an older chip swaps the flattened run.
    fireEvent.click(screen.getByText(/Jul 6/));
    expect(screen.getByTestId('ledger')).toHaveAttribute('data-run', 'r3');
  });
});

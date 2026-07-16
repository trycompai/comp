import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunHistoryStrip, type RunSummary } from './RunHistoryStrip';

function summary(overrides: Partial<BrowserAutomationRun> & { id: string }): RunSummary {
  return {
    automationId: 'auto_1',
    automationName: 'MFA policy',
    run: {
      status: 'completed',
      createdAt: '2026-07-16T06:02:00Z',
      screenshotUrl: 'https://s3.example.com/shot.png',
      ...overrides,
    } as BrowserAutomationRun,
  };
}

describe('RunHistoryStrip', () => {
  it('renders nothing when there are no runs', () => {
    const { container } = render(<RunHistoryStrip runs={[]} onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a tile per run with the section header', () => {
    render(
      <RunHistoryStrip
        runs={[summary({ id: 'r1' }), summary({ id: 'r2' })]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/run history/i)).toBeInTheDocument();
    expect(screen.getAllByAltText(/MFA policy screenshot/i)).toHaveLength(2);
  });

  it('shows a PASS badge for a passing evaluation', () => {
    render(
      <RunHistoryStrip runs={[summary({ id: 'r1', evaluationStatus: 'pass' })]} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.queryByText('Fail')).not.toBeInTheDocument();
  });

  it('shows a FAIL badge for a failed run', () => {
    render(
      <RunHistoryStrip runs={[summary({ id: 'r1', status: 'failed' })]} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Fail')).toBeInTheDocument();
    expect(screen.queryByText('Pass')).not.toBeInTheDocument();
  });

  it('calls onSelect with the clicked run summary', () => {
    const onSelect = vi.fn();
    const runs = [summary({ id: 'r1' }), summary({ id: 'r2' })];
    render(<RunHistoryStrip runs={runs} onSelect={onSelect} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelect).toHaveBeenCalledWith(runs[0]);
  });

  it('caps at six tiles and reveals the rest via View all', () => {
    const runs = Array.from({ length: 8 }, (_, i) => summary({ id: `r${i}` }));
    render(<RunHistoryStrip runs={runs} onSelect={vi.fn()} />);
    expect(screen.getAllByAltText(/MFA policy screenshot/i)).toHaveLength(6);

    fireEvent.click(screen.getByText('View all 8 runs'));
    expect(screen.getAllByAltText(/MFA policy screenshot/i)).toHaveLength(8);
    expect(screen.getByText('Show fewer')).toBeInTheDocument();
  });
});

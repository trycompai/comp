import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunDetailOverlay } from './RunDetailOverlay';
import type { RunSummary } from './RunHistoryStrip';

function summary(overrides: Partial<BrowserAutomationRun> = {}): RunSummary {
  return {
    automationId: 'auto_1',
    automationName: 'MFA policy',
    run: {
      id: 'bar_1',
      status: 'completed',
      createdAt: '2026-07-16T06:02:00Z',
      screenshotUrl: 'https://s3.example.com/shot.png',
      evaluationStatus: 'pass',
      evaluationReason: 'Two-factor enforced for all members',
      ...overrides,
    } as BrowserAutomationRun,
  };
}

describe('RunDetailOverlay', () => {
  it('renders nothing when no run is selected', () => {
    render(<RunDetailOverlay selected={null} onClose={vi.fn()} />);
    expect(screen.queryByText(/MFA policy/i)).not.toBeInTheDocument();
  });

  it('shows the instruction name, verdict and check reason for a selected run', () => {
    render(<RunDetailOverlay selected={summary()} onClose={vi.fn()} />);
    expect(screen.getByText(/MFA policy/i)).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText(/two-factor enforced/i)).toBeInTheDocument();
  });

  it('points the full-size link at the stable redirect endpoint', () => {
    render(<RunDetailOverlay selected={summary()} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /open full size/i });
    expect(link.getAttribute('href')).toContain('/v1/browserbase/runs/bar_1/screenshot');
    expect(link.getAttribute('href')).not.toContain('s3.example.com');
  });

  it('re-runs and closes when Re-run now is pressed', () => {
    const onRerun = vi.fn();
    const onClose = vi.fn();
    render(<RunDetailOverlay selected={summary()} onClose={onClose} onRerun={onRerun} />);
    fireEvent.click(screen.getByRole('button', { name: /re-run now/i }));
    expect(onRerun).toHaveBeenCalledWith('auto_1');
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces the failure reason for a blocked run', () => {
    render(
      <RunDetailOverlay
        selected={summary({
          status: 'blocked',
          evaluationStatus: null,
          evaluationReason: null,
          blockedReason: 'Login session expired',
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText(/login session expired/i)).toBeInTheDocument();
  });
});

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

  it('shows the instruction name and the step reason', () => {
    render(<RunDetailOverlay selected={summary()} onClose={vi.fn()} />);
    expect(screen.getByText(/MFA policy/i)).toBeInTheDocument();
    expect(screen.getByText(/two-factor enforced/i)).toBeInTheDocument();
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
    expect(screen.getByText(/login session expired/i)).toBeInTheDocument();
  });

  it('shows each vendor step for a multi-step run', () => {
    render(
      <RunDetailOverlay
        selected={summary({
          status: 'failed',
          evaluationStatus: null,
          evaluationReason: null,
          stepRuns: [
            {
              id: 'sr1',
              order: 0,
              status: 'completed',
              evaluationStatus: 'pass',
              evaluationReason: '8,165 commits — meets the check',
              screenshotUrl: 'https://s3.example.com/gh.png',
              step: { targetUrl: 'https://github.com/acme' },
            },
            {
              id: 'sr2',
              order: 1,
              status: 'failed',
              error: 'Re-auth blocked the IAM page',
              screenshotUrl: null,
              step: { targetUrl: 'https://aws.amazon.com/console' },
            },
          ],
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getByText('aws.amazon.com')).toBeInTheDocument();
    expect(screen.getByText(/8,165 commits/)).toBeInTheDocument();
    expect(screen.getByText(/re-auth blocked the iam page/i)).toBeInTheDocument();
  });
});

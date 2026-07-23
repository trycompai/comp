import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunItem } from './RunItem';

const baseRun: BrowserAutomationRun = {
  id: 'bar_123',
  status: 'completed',
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  screenshotUrl: 'https://s3.example.com/signed?sig=abc',
  evaluationStatus: 'pass',
  evaluationReason: 'All good',
  error: undefined,
} as unknown as BrowserAutomationRun;

describe('RunItem', () => {
  it('shows the step ledger (reason + screenshot) when expanded', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    // Single-step runs auto-expand — the reason and the proof image show.
    expect(screen.getByText('All good')).toBeInTheDocument();
    const img = screen.getByAltText('Close-up · Proof') as HTMLImageElement;
    expect(img.src).toContain('s3.example.com');
  });

  it('shows both the close-up and the full page when a close-up is present', () => {
    const run = {
      ...baseRun,
      focusScreenshotUrl: 'https://s3.example.com/focus?sig=xyz',
    } as unknown as BrowserAutomationRun;
    render(<RunItem run={run} isLatest={true} />);
    expect(screen.getByAltText('Close-up · Proof')).toBeInTheDocument();
    expect(screen.getByAltText('Full page · Context — scrolls')).toBeInTheDocument();
  });

  it('surfaces a failed step reason with no screenshots', () => {
    const run = {
      id: 'bar_9',
      status: 'failed',
      createdAt: new Date().toISOString(),
      blockedReason: 'Re-auth blocked the IAM page',
      screenshotUrl: undefined,
      evaluationStatus: null,
    } as unknown as BrowserAutomationRun;
    render(<RunItem run={run} isLatest={true} />);
    expect(screen.getByText(/re-auth blocked the iam page/i)).toBeInTheDocument();
    expect(screen.getByText(/0 screenshots/i)).toBeInTheDocument();
  });
});

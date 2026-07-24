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
} as unknown as BrowserAutomationRun;

describe('RunItem', () => {
  it('renders a collapsed run row with verdict + screenshot count, no images', () => {
    render(<RunItem run={baseRun} isLatest={false} />);
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText(/1 screenshot/i)).toBeInTheDocument();
    // Collapsed → the step ledger (and its images) is not rendered.
    expect(screen.queryByAltText('Close-up · Proof')).not.toBeInTheDocument();
  });

  it('expands into the step ledger', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    // Latest run auto-expands → the step ledger shows the proof screenshot.
    expect(screen.getByAltText('Close-up · Proof')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('counts both screenshots when a close-up is present', () => {
    render(
      <RunItem
        run={{ ...baseRun, focusScreenshotUrl: 'https://s3.example.com/f.png' } as BrowserAutomationRun}
        isLatest={false}
      />,
    );
    expect(screen.getByText(/2 screenshots/i)).toBeInTheDocument();
  });
});

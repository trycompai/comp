import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunStepLedger } from './RunStepLedger';

function run(overrides: Partial<BrowserAutomationRun> = {}): BrowserAutomationRun {
  return {
    id: 'r1',
    status: 'completed',
    createdAt: '2026-07-16T06:02:00Z',
    ...overrides,
  } as BrowserAutomationRun;
}

describe('RunStepLedger', () => {
  it('auto-expands a single-step run and shows its proof screenshot', () => {
    render(
      <RunStepLedger
        run={run({
          evaluationStatus: 'pass',
          evaluationReason: 'meets the check',
          screenshotUrl: 'https://s3.example.com/x.png',
        })}
      />,
    );
    expect(screen.getByAltText('Close-up · Proof')).toBeInTheDocument();
  });

  it('collapses multi-step rows and expands one on click', () => {
    render(
      <RunStepLedger
        run={run({
          stepRuns: [
            {
              id: 'a',
              order: 0,
              status: 'completed',
              evaluationStatus: 'pass',
              evaluationReason: 'gh ok',
              screenshotUrl: 'https://s3.example.com/gh.png',
              step: { targetUrl: 'https://github.com/a' },
            },
            {
              id: 'b',
              order: 1,
              status: 'completed',
              evaluationStatus: 'pass',
              evaluationReason: 'aws ok',
              screenshotUrl: 'https://s3.example.com/aws.png',
              step: { targetUrl: 'https://aws.amazon.com/c' },
            },
          ],
        })}
      />,
    );
    // Collapsed: no screenshots rendered yet, both rows show a count.
    expect(screen.queryByAltText('Close-up · Proof')).not.toBeInTheDocument();
    expect(screen.getAllByText(/1 screenshot/i)).toHaveLength(2);

    // Expanding a row reveals its proof screenshot.
    fireEvent.click(screen.getByText('gh ok'));
    expect(screen.getByAltText('Close-up · Proof')).toBeInTheDocument();
  });
});

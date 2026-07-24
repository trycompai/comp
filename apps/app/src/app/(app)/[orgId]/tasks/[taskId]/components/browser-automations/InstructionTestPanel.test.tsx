import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { InstructionTestResult } from '../../hooks/types';
import { InstructionTestPanel } from './InstructionTestPanel';

describe('InstructionTestPanel', () => {
  it('shows the idle prompt before a test runs', () => {
    render(<InstructionTestPanel phase="idle" host="app.example.com" steps={[]} />);
    expect(screen.getByText(/test to watch the ai live/i)).toBeInTheDocument();
  });

  it('shows the running state with the live view and host', () => {
    render(
      <InstructionTestPanel
        phase="testing"
        host="app.example.com"
        liveViewUrl="https://live.example/view"
        steps={[{ l: 'Opening the page', state: 'active' }]}
      />,
    );
    expect(screen.getByText(/ai running/i)).toBeInTheDocument();
    expect(screen.getByText('app.example.com')).toBeInTheDocument();
    expect(screen.getByTitle('Test run live view')).toBeInTheDocument();
    expect(screen.getByText('Opening the page')).toBeInTheDocument();
  });

  it('shows a passing verdict with the check reason', () => {
    const result: InstructionTestResult = {
      success: true,
      evaluationStatus: 'pass',
      evaluationReason: 'MFA is enforced for all members',
      screenshotUrl: 'https://s3/x.png',
    };
    render(<InstructionTestPanel phase="result" host="app.example.com" steps={[]} result={result} />);
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Check passed')).toBeInTheDocument();
    expect(screen.getByText(/mfa is enforced/i)).toBeInTheDocument();
  });

  it('shows a failure verdict with the error', () => {
    const result: InstructionTestResult = {
      success: false,
      error: 'The AI got stuck on the login page',
      failureCode: 'action_failed',
    };
    render(<InstructionTestPanel phase="result" host="app.example.com" steps={[]} result={result} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/got stuck/i)).toBeInTheDocument();
  });

  it('flags a needs-reconnect run as a warning', () => {
    const result: InstructionTestResult = {
      success: false,
      needsReauth: true,
      blockedReason: 'Session expired',
    };
    render(<InstructionTestPanel phase="result" host="app.example.com" steps={[]} result={result} />);
    expect(screen.getByText('Needs reconnect')).toBeInTheDocument();
  });
});

// apps/app/src/app/(app)/[orgId]/tasks/[taskId]/components/browser-automations/RunItem.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RunItem } from './RunItem';
import type { BrowserAutomationRun } from '../../hooks/types';

const baseRun: BrowserAutomationRun = {
  id: 'bar_123',
  status: 'completed',
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  screenshotUrl: 'https://s3.example.com/signed?sig=abc',
  evaluationStatus: 'pass',
  evaluationReason: 'All good',
  error: null,
} as unknown as BrowserAutomationRun;

describe('RunItem', () => {
  it('Open full size anchor points at the stable redirect endpoint, not the signed URL', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    const link = screen.getByRole('link', { name: /open full size/i });
    expect(link.getAttribute('href')).toContain(
      '/v1/browserbase/runs/bar_123/screenshot',
    );
    expect(link.getAttribute('href')).not.toContain('s3.example.com');
  });

  it('Try direct link fallback also points at the stable redirect endpoint', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    const img = screen.getByAltText('Automation screenshot');
    fireEvent.error(img);
    const fallback = screen.getByRole('link', { name: /try direct link/i });
    expect(fallback.getAttribute('href')).toContain(
      '/v1/browserbase/runs/bar_123/screenshot',
    );
  });

  it('renders the inline thumbnail using the presigned URL from the run payload', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    const img = screen.getByAltText('Automation screenshot') as HTMLImageElement;
    expect(img.src).toContain('s3.example.com');
  });

  it('Download anchor points at the redirect endpoint with ?download=true', () => {
    render(<RunItem run={baseRun} isLatest={true} />);
    const link = screen.getByRole('link', { name: /download/i });
    expect(link.getAttribute('href')).toContain(
      '/v1/browserbase/runs/bar_123/screenshot?download=true',
    );
  });
});

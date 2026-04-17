import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetricsSection } from './MetricsSection';

describe('MetricsSection (CS-97)', () => {
  beforeEach(() => {
    // shouldAdvanceTime lets React effects flush on their normal tick
    // while still letting us pin `new Date()` with vi.setSystemTime.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels the schedule as 9:00 AM UTC (no ambiguous local time)', () => {
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    render(<MetricsSection initialVersions={[]} initialRuns={[]} />);
    expect(screen.getByText('Every day at 9:00 AM UTC')).toBeInTheDocument();
  });

  it('uses an SSR-safe placeholder for the next run (defers date formatting to post-mount)', () => {
    // Verify the initial JSX does NOT synchronously format a Date — that's
    // the property that keeps SSR and hydration outputs identical. We
    // simulate "server-side" rendering with renderToString and assert the
    // Next Run cell specifically contains the em-dash placeholder rather
    // than a formatted weekday/time. We scope the assertion to the Next Run
    // card because Success Rate also renders `—` when there are no runs.
    const { renderToString } = require('react-dom/server') as typeof import('react-dom/server');
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    const html = renderToString(
      <MetricsSection initialVersions={[]} initialRuns={[]} />,
    );

    // No weekday should appear anywhere in SSR output.
    expect(html).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);

    // Locate the Next Run cell and assert its value paragraph contains `—`.
    // Matches: <p ...>Next Run</p><p class="...">—</p>
    const nextRunCellMatch = html.match(
      /Next Run[^<]*<\/p>\s*<p[^>]*>([^<]*)<\/p>/,
    );
    expect(nextRunCellMatch).not.toBeNull();
    expect(nextRunCellMatch?.[1]).toBe('—');
  });

  it('fills in the next-run label after mount with a concrete weekday, time, and timezone', async () => {
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    render(<MetricsSection initialVersions={[]} initialRuns={[]} />);

    // Old hardcoded literals must never appear.
    expect(screen.queryByText('Every Day 9:00 AM')).not.toBeInTheDocument();
    expect(screen.queryByText('Tomorrow 9:00 AM')).not.toBeInTheDocument();

    // After mount the effect runs and the real label shows up. It must
    // include an explicit timezone so it's not confused with the UTC
    // Schedule card next to it — e.g. "Thu 9:00 AM UTC" or "Thu, 12:00 PM EST".
    // Node/browser locales may insert a comma after the weekday; allow both.
    const nextRunLabels = await screen.findAllByText(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s\d{1,2}:\d{2}\s(AM|PM)\s.+/,
    );
    expect(nextRunLabels.length).toBeGreaterThan(0);
  });

  it('picks today (UTC) when the current time is before 09:00 UTC', async () => {
    // 2026-04-16 07:00 UTC → next run is 2026-04-16 09:00 UTC (same day).
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    render(<MetricsSection initialVersions={[]} initialRuns={[]} />);

    const expected = new Date('2026-04-16T09:00:00Z').toLocaleString(
      undefined,
      {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      },
    );
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('picks the next day (UTC) when the current time is past 09:00 UTC', async () => {
    // 2026-04-16 10:00 UTC → today's run already happened, next is 2026-04-17 09:00 UTC.
    vi.setSystemTime(new Date('2026-04-16T10:00:00Z'));
    render(<MetricsSection initialVersions={[]} initialRuns={[]} />);

    const expected = new Date('2026-04-17T09:00:00Z').toLocaleString(
      undefined,
      {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      },
    );
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetricsSection } from './MetricsSection';

describe('MetricsSection (SALE-49)', () => {
  beforeEach(() => {
    // shouldAdvanceTime lets React effects flush on their normal tick
    // while still letting us pin `new Date()` with vi.setSystemTime.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses an SSR-safe placeholder for schedule + next run (defers date formatting to post-mount)', () => {
    const { renderToString } = require('react-dom/server') as typeof import('react-dom/server');
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    const html = renderToString(
      <MetricsSection
        initialVersions={[]}
        initialRuns={[]}
        scheduleFrequency="daily"
        lastRunAt={null}
      />,
    );

    // No weekday and no UTC literal in SSR output — defers locale-dependent
    // formatting to the client-only effect.
    expect(html).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
    expect(html).not.toMatch(/UTC/);

    // Both Schedule and Next Run cells should show the em-dash placeholder.
    const scheduleCell = html.match(/Schedule[^<]*<\/p>\s*<p[^>]*>([^<]*)<\/p>/);
    const nextRunCell = html.match(/Next Run[^<]*<\/p>\s*<p[^>]*>([^<]*)<\/p>/);
    expect(scheduleCell?.[1]).toBe('—');
    expect(nextRunCell?.[1]).toBe('—');
  });

  it('labels the daily schedule with the user\'s timezone (not UTC)', async () => {
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    render(
      <MetricsSection
        initialVersions={[]}
        initialRuns={[]}
        scheduleFrequency="daily"
        lastRunAt={null}
      />,
    );

    // After mount: "Every day at <time> <TZ>". Time is locale-formatted, so
    // we assert the recurring prefix and a timezone abbreviation; we don't
    // pin the literal time because it depends on the test runner's TZ.
    const label = await screen.findByText(/^Every day at \d{1,2}:\d{2}\s(AM|PM)\s\S+/);
    expect(label).toBeInTheDocument();
    expect(label.textContent).not.toContain('UTC at');
  });

  it('updates the schedule label when the frequency changes', async () => {
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    const { rerender } = render(
      <MetricsSection
        initialVersions={[]}
        initialRuns={[]}
        scheduleFrequency="daily"
        lastRunAt={null}
      />,
    );
    expect(await screen.findByText(/^Every day at /)).toBeInTheDocument();

    rerender(
      <MetricsSection
        initialVersions={[]}
        initialRuns={[]}
        scheduleFrequency="weekly"
        lastRunAt={null}
      />,
    );
    expect(await screen.findByText(/^Every week at /)).toBeInTheDocument();
    expect(screen.queryByText(/^Every day at /)).not.toBeInTheDocument();
  });

  it('renders concrete weekday + date + timezone for next run after mount', async () => {
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    render(
      <MetricsSection
        initialVersions={[]}
        initialRuns={[]}
        scheduleFrequency="daily"
        lastRunAt={null}
      />,
    );

    // Format: "Thu, Apr 16, 9:00 AM <TZ>" — must include a timezone short name
    // so the user isn't left guessing the offset.
    const nextRunLabels = await screen.findAllByText(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s\w+\s\d{1,2},?\s\d{1,2}:\d{2}\s(AM|PM)\s\S+/,
    );
    expect(nextRunLabels.length).toBeGreaterThan(0);
  });

  it('pushes the next run forward by 7 days when frequency is weekly with a recent lastRunAt', async () => {
    // 2026-04-16 07:00 UTC. lastRunAt was today. Weekly → next run ~7 days later.
    vi.setSystemTime(new Date('2026-04-16T07:00:00Z'));
    render(
      <MetricsSection
        initialVersions={[]}
        initialRuns={[]}
        scheduleFrequency="weekly"
        lastRunAt={new Date('2026-04-16T09:00:00Z')}
      />,
    );

    // 2026-04-23 (Thursday)
    const expectedDate = new Date('2026-04-23T09:00:00Z').toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
    expect(await screen.findByText(expectedDate)).toBeInTheDocument();
  });
});

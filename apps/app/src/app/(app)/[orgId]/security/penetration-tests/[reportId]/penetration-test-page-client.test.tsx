import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import type { PentestRun } from '@/lib/security/penetration-tests-client';
import { PenetrationTestPageClient } from './penetration-test-page-client';

const usePenetrationTestMock = vi.fn();
const usePenetrationTestProgressMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('../hooks/use-penetration-tests', () => ({
  usePenetrationTest: (...args: never[]) => usePenetrationTestMock(...args),
  usePenetrationTestProgress: (...args: never[]) => usePenetrationTestProgressMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

const reportMock = usePenetrationTestMock as ReturnType<typeof vi.fn>;
const progressMock = usePenetrationTestProgressMock as ReturnType<typeof vi.fn>;

describe('PenetrationTestPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator before the report is available', () => {
    reportMock.mockReturnValue({
      report: undefined,
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: null,
      isLoading: false,
    });

    const { container } = render(<PenetrationTestPageClient orgId="org_123" reportId="run_1" />);

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows an error state when report loading fails', () => {
    reportMock.mockReturnValue({
      report: undefined,
      isLoading: false,
      error: new Error('Not found'),
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: null,
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_1" />);

    expect(screen.getByText('Unable to load report')).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('falls back to a generic message when report error is not an Error instance', () => {
    reportMock.mockReturnValue({
      report: undefined,
      isLoading: false,
      error: 'fatal payload fetch error' as never,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: null,
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_1" />);

    expect(screen.getByText('Unable to load report')).toBeInTheDocument();
    expect(screen.getByText('No report found for this organization.')).toBeInTheDocument();
  });

  it('renders completed report details and artifact links', () => {
    const report: PentestRun = {
      id: 'run_1',
      targetUrl: 'https://example.com',
      repoUrl: 'https://github.com/org/repo',
      status: 'completed',
      createdAt: '2026-02-26T18:00:00Z',
      updatedAt: '2026-02-26T18:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
    };

    reportMock.mockReturnValue({
      report,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: null,
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_1" />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText('https://github.com/org/repo')).toBeInTheDocument();
    expect(screen.getByText('View markdown')).toBeInTheDocument();
    expect(screen.getByText('Download PDF')).toBeInTheDocument();
    expect(screen.queryByText('Current progress')).toBeNull();
  });

  it('shows repository placeholder when repoUrl is missing', () => {
    const report: PentestRun = {
      id: 'run_6',
      targetUrl: 'https://example.com',
      repoUrl: null,
      status: 'completed',
      createdAt: '2026-02-26T18:00:00Z',
      updatedAt: '2026-02-25T18:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
    };

    reportMock.mockReturnValue({
      report,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: null,
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_6" />);

    expect(screen.getByText('Repository')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders running progress section when a live report is available', async () => {
    const report: PentestRun = {
      id: 'run_2',
      targetUrl: 'https://example.com',
      repoUrl: 'https://github.com/org/repo',
      status: 'running',
      createdAt: '2026-02-26T18:00:00Z',
      updatedAt: '2026-02-26T18:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
    };

    reportMock.mockReturnValue({
      report,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: {
        status: 'running',
        completedAgents: 1,
        totalAgents: 2,
        elapsedMs: 300,
      },
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_2" />);

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Current progress')).toBeInTheDocument();
    expect(screen.getByText('In progress (1/2)')).toBeInTheDocument();
    expect(screen.queryByText('Download PDF')).toBeNull();
  });

  it('renders progress fallback text when agent counts are unavailable', async () => {
    const report: PentestRun = {
      id: 'run_4',
      targetUrl: 'https://example.com',
      repoUrl: 'https://github.com/org/repo',
      status: 'running',
      createdAt: '2026-02-26T18:00:00Z',
      updatedAt: '2026-02-26T18:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
    };

    reportMock.mockReturnValue({
      report,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: {
        status: 'running',
        completedAgents: '1' as unknown as number,
        totalAgents: '2' as unknown as number,
        elapsedMs: 400,
      },
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_4" />);

    expect(screen.getByText('Current progress')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('allows progress updates to render from the progress hook contract', () => {
    const report: PentestRun = {
      id: 'run_3',
      targetUrl: 'https://example.com',
      repoUrl: 'https://github.com/org/repo',
      status: 'failed',
      createdAt: '2026-02-26T18:00:00Z',
      updatedAt: '2026-02-26T18:30:00Z',
      error: 'Scan failed due to provider timeout',
      temporalUiUrl: 'https://temporal.ui/session',
      webhookUrl: null,
    };

    reportMock.mockReturnValue({
      report,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    });
    progressMock.mockReturnValue({
      progress: null,
      isLoading: false,
    });

    render(<PenetrationTestPageClient orgId="org_123" reportId="run_3" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Scan failed due to provider timeout')).toBeInTheDocument();
    expect(screen.getByText('Open temporal UI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open temporal UI' })).toBeInTheDocument();
  });
});

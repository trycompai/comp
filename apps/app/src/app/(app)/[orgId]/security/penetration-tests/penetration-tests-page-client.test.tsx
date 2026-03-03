import { cloneElement, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PentestRun } from '@/lib/security/penetration-tests-client';
import * as integrationPlatform from '@/hooks/use-integration-platform';
import * as pentestHooks from './hooks/use-penetration-tests';
import { PenetrationTestsPageClient } from './penetration-tests-page-client';

const { pushMock, reportHookMock, createHookMock, createReportMock, toastSuccessMock, toastErrorMock, startOAuthMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  reportHookMock: vi.fn(),
  createHookMock: vi.fn(),
  createReportMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  startOAuthMock: vi.fn().mockResolvedValue({ success: false, error: 'Not configured' }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    replace: vi.fn(),
    push: pushMock,
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('./hooks/use-penetration-tests', () => ({
  usePenetrationTests: (...args: never[]) => reportHookMock(...args),
  useCreatePenetrationTest: (...args: never[]) => createHookMock(...args),
  usePenetrationTest: vi.fn(),
  usePenetrationTestProgress: vi.fn(),
  useGithubRepos: vi.fn().mockReturnValue({ repos: [], isLoading: false }),
}));

vi.mock('@/hooks/use-integration-platform', () => ({
  useIntegrationConnections: vi.fn().mockReturnValue({ connections: [], isLoading: false }),
  useIntegrationMutations: vi.fn().mockReturnValue({ startOAuth: startOAuthMock }),
}));

vi.mock('@comp/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: ReactNode; onValueChange?: (value: string) => void }) => (
    <div data-testid="github-repo-select">{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <button type="button" data-value={value}>{children}</button>
  ),
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => <div id={id}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('@comp/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@comp/ui/label', () => ({
  Label: ({ children, ...props }: React.ComponentProps<'label'>) => <label {...props}>{children}</label>,
}));

vi.mock('@comp/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => (
    <div data-open={String(open)}>{children}</div>
  ),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@comp/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  CardTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@comp/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system', () => ({
  Button: ({ asChild, children, ...props }: ComponentProps<'button'> & { asChild?: boolean }) => {
    if (asChild && isValidElement(children)) {
      return cloneElement(children, { ...props });
    }
    return (
      <button type={props.type} {...props}>
        {children}
      </button>
    );
  },
  PageHeader: ({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {actions}
      {children}
    </header>
  ),
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));

const reportRows: PentestRun[] = [
  {
    id: 'run_running',
    targetUrl: 'https://running.example.com',
    repoUrl: 'https://github.com/org/running',
    status: 'running',
    createdAt: '2026-02-26T12:00:00Z',
    updatedAt: '2026-02-26T13:00:00Z',
    error: null,
    temporalUiUrl: null,
    webhookUrl: null,
  },
  {
    id: 'run_completed',
    targetUrl: 'https://completed.example.com',
    repoUrl: 'https://github.com/org/completed',
    status: 'completed',
    createdAt: '2026-02-25T12:00:00Z',
    updatedAt: '2026-02-25T13:00:00Z',
    error: null,
    temporalUiUrl: null,
    webhookUrl: null,
  },
];

describe('PenetrationTestsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    reportHookMock.mockReturnValue({
      reports: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [],
      completedReports: [],
    });

    createReportMock.mockResolvedValue({
      id: 'run_new',
      status: 'provisioning',
    });

    createHookMock.mockReturnValue({
      createReport: createReportMock,
      isCreating: false,
      error: null,
      resetError: vi.fn(),
    });

    startOAuthMock.mockResolvedValue({ success: false, error: 'Not configured' });

    vi.mocked(integrationPlatform.useIntegrationConnections).mockReturnValue({
      connections: [],
      isLoading: false,
      error: undefined,
      refresh: vi.fn(),
    });
    vi.mocked(integrationPlatform.useIntegrationMutations).mockReturnValue({
      startOAuth: startOAuthMock,
    } as ReturnType<typeof integrationPlatform.useIntegrationMutations>);

    vi.mocked(pentestHooks.useGithubRepos).mockReturnValue({
      repos: [],
      isLoading: false,
    } as ReturnType<typeof pentestHooks.useGithubRepos>);
  });

  it('renders an empty state and call-to-action when no reports exist', () => {
    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getAllByText('No reports yet')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Create your first report' })).toBeInTheDocument();
  });

  it('renders loading state for submit button while run creation is in progress', () => {
    createHookMock.mockReturnValue({
      createReport: createReportMock,
      isCreating: true,
      error: null,
      resetError: vi.fn(),
    });

    const { getByText } = render(<PenetrationTestsPageClient orgId="org_123" />);

    fireEvent.click(getByText('Create your first report'));

    expect(screen.getByText('Starting...')).toBeInTheDocument();
    expect(screen.getByText('Starting...').closest('button')).toBeTruthy();
  });

  it('displays completed report summary when there are no active reports', () => {
    reportHookMock.mockReturnValue({
      reports: [reportRows[1]],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [],
      completedReports: [reportRows[1]],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('1 completed report')).toBeInTheDocument();
  });

  it('uses pluralized summary copy for multiple active and completed report counts', () => {
    reportHookMock.mockReturnValue({
      reports: reportRows,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: reportRows,
      completedReports: [reportRows[1], { ...reportRows[1], id: 'run_completed_2' }],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('2 reports in progress')).toBeInTheDocument();
  });

  it('uses pluralized summary copy for multiple completed reports when none are active', () => {
    reportHookMock.mockReturnValue({
      reports: [{ ...reportRows[1], id: 'run_completed_2' }, reportRows[1]],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [],
      completedReports: [{ ...reportRows[1], id: 'run_completed_2' }, reportRows[1]],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('2 completed reports')).toBeInTheDocument();
  });

  it('shows in-progress text with agent counts for a running report', () => {
    const runningWithProgress: PentestRun = {
      id: 'run_with_progress',
      targetUrl: 'https://running.example.com',
      repoUrl: 'https://github.com/org/running',
      status: 'running',
      createdAt: '2026-02-26T14:00:00Z',
      updatedAt: '2026-02-26T14:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
      progress: {
        status: 'running',
        completedAgents: 0,
        totalAgents: 2,
        elapsedMs: 500,
      },
    };

    reportHookMock.mockReturnValue({
      reports: [runningWithProgress],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [runningWithProgress],
      completedReports: [],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('In progress (0/2)')).toBeInTheDocument();
  });

  it('renders running and completed reports in the table', () => {
    reportHookMock.mockReturnValue({
      reports: reportRows,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [reportRows[0]],
      completedReports: [reportRows[1]],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('https://running.example.com')).toBeInTheDocument();
    expect(screen.getByText('https://completed.example.com')).toBeInTheDocument();
    expect(screen.getByText('1 report in progress')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'View output' })).toHaveLength(2);
  });

  it('renders repository fallback when repoUrl is not available', () => {
    const noRepoRun: PentestRun = {
      id: 'run_no_repo',
      targetUrl: 'https://no-repo.example.com',
      repoUrl: null,
      status: 'running',
      createdAt: '2026-02-26T14:00:00Z',
      updatedAt: '2026-02-26T14:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
      progress: {
        status: 'running',
        completedAgents: 1,
        totalAgents: 2,
        elapsedMs: 1000,
      },
    };

    reportHookMock.mockReturnValue({
      reports: [noRepoRun],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [noRepoRun],
      completedReports: [],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('https://no-repo.example.com')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows a loading state while list data is loading', () => {
    reportHookMock.mockReturnValue({
      reports: [],
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [],
      completedReports: [],
    });

    const { container } = render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders progress for running report rows with agent counts', () => {
    const inProgressRun: PentestRun = {
      id: 'run_in_progress',
      targetUrl: 'https://running-progress.example.com',
      repoUrl: 'https://github.com/org/running-progress',
      status: 'running',
      createdAt: '2026-02-26T14:00:00Z',
      updatedAt: '2026-02-26T14:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
      progress: {
        status: 'running',
        completedAgents: 1,
        totalAgents: 2,
        elapsedMs: 1500,
      },
    };

    reportHookMock.mockReturnValue({
      reports: [inProgressRun],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [inProgressRun],
      completedReports: [],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('In progress (1/2)')).toBeInTheDocument();
  });

  it('renders progress row without counts when agent count values are unavailable', () => {
    const noCounts: PentestRun = {
      id: 'run_without_counts',
      targetUrl: 'https://running-progress.example.com',
      repoUrl: 'https://github.com/org/running-progress',
      status: 'running',
      createdAt: '2026-02-26T14:00:00Z',
      updatedAt: '2026-02-26T14:30:00Z',
      error: null,
      temporalUiUrl: null,
      webhookUrl: null,
      progress: {
        status: 'running',
        completedAgents: 'n/a' as unknown as number,
        totalAgents: 'n/a' as unknown as number,
        elapsedMs: 0,
      },
    };

    reportHookMock.mockReturnValue({
      reports: [noCounts],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      activeReports: [noCounts],
      completedReports: [],
    });

    render(<PenetrationTestsPageClient orgId="org_123" />);

    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.queryByText('(n/a/n/a)')).toBeNull();
  });

  it('creates a report and navigates to the report detail page', async () => {
    const { getByText, getByLabelText } = render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(getByText('Create Report'));
    });

    await act(async () => {
      fireEvent.change(getByLabelText('Target URL'), {
        target: {
          value: 'https://example.com',
        },
      });
      fireEvent.change(getByLabelText('Repository URL'), {
        target: {
          value: 'https://github.com/org/repo',
        },
      });
      fireEvent.click(getByText('Start penetration test'));
    });

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalledWith({
        targetUrl: 'https://example.com',
        repoUrl: 'https://github.com/org/repo',
      });
      expect(toastSuccessMock).toHaveBeenCalledWith('Penetration test queued successfully.');
      expect(pushMock).toHaveBeenCalledWith('/org_123/security/penetration-tests/run_new');
    });
  });

  it('requires target URL before submitting report request', async () => {
    render(<PenetrationTestsPageClient orgId="org_123" />);
    const submitForm = screen.getByText('Start penetration test').closest('form');

    await act(async () => {
      fireEvent.submit(submitForm as HTMLFormElement);
    });

    await waitFor(() => {
      expect(createReportMock).not.toHaveBeenCalled();
      expect(toastErrorMock).toHaveBeenCalledWith('Target URL is required');
    });
  });

  it('creates a report without repository URL when only target is provided', async () => {
    const { getByText, getByLabelText } = render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(getByText('Create Report'));
    });

    await act(async () => {
      fireEvent.change(getByLabelText('Target URL'), {
        target: {
          value: 'jungle.ai',
        },
      });
      fireEvent.click(getByText('Start penetration test'));
    });

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalledWith({
        targetUrl: 'https://jungle.ai',
        repoUrl: undefined,
      });
    });
  });

  it('surfaces errors when run creation fails', async () => {
    createReportMock.mockRejectedValue(new Error('No active pentest subscription.'));

    const { getByText, getByLabelText } = render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(getByText('Create Report'));
    });

    await act(async () => {
      fireEvent.change(getByLabelText('Target URL'), {
        target: {
          value: 'https://example.com',
        },
      });
      fireEvent.change(getByLabelText('Repository URL'), {
        target: {
          value: 'https://github.com/org/repo',
        },
      });
      fireEvent.click(getByText('Start penetration test'));
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('No active pentest subscription.');
    });
  });

  it('surfaces a generic error message when run creation fails with non-error value', async () => {
    createReportMock.mockRejectedValue('service-down');

    const { getByText, getByLabelText } = render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(getByText('Create Report'));
    });

    await act(async () => {
      fireEvent.change(getByLabelText('Target URL'), {
        target: {
          value: 'https://example.com',
        },
      });
      fireEvent.change(getByLabelText('Repository URL'), {
        target: {
          value: 'https://github.com/org/repo',
        },
      });
      fireEvent.click(getByText('Start penetration test'));
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Could not queue a new report');
    });
  });

  it('shows a Connect GitHub button when GitHub is not connected', async () => {
    render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(screen.getByText('Create Report'));
    });

    expect(screen.getByRole('button', { name: 'Connect GitHub' })).toBeInTheDocument();
    expect(screen.queryByTestId('github-repo-select')).toBeNull();
  });

  it('shows the repo selector dropdown when GitHub is connected', async () => {
    vi.mocked(integrationPlatform.useIntegrationConnections).mockReturnValue({
      connections: [{ id: 'conn_1', providerSlug: 'github', status: 'active', variables: null, errorMessage: null }] as never,
      isLoading: false,
      error: undefined,
      refresh: vi.fn(),
    });
    vi.mocked(pentestHooks.useGithubRepos).mockReturnValue({
      repos: [{ id: 1, name: 'repo', fullName: 'org/repo', private: false, htmlUrl: 'https://github.com/org/repo' }],
      isLoading: false,
    } as ReturnType<typeof pentestHooks.useGithubRepos>);

    render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(screen.getByText('Create Report'));
    });

    expect(screen.getByTestId('github-repo-select')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect GitHub' })).toBeNull();
  });

  it('starts GitHub OAuth when Connect GitHub button is clicked', async () => {
    render(<PenetrationTestsPageClient orgId="org_123" />);

    await act(async () => {
      fireEvent.click(screen.getByText('Create Report'));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Connect GitHub' }));
    });

    expect(startOAuthMock).toHaveBeenCalledWith('github', expect.any(String));
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type SwrShape = {
  data: { data: unknown } | undefined;
  error: unknown;
  isLoading: boolean;
  mutate: () => Promise<unknown> | unknown;
};

const swrMock = vi.fn<() => SwrShape>();
const deleteMock = vi.fn();
const hasPermissionMock = vi.fn().mockReturnValue(true);

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    useSWR: (_url: string) => swrMock(),
    delete: (url: string) => deleteMock(url),
  }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: hasPermissionMock,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@trycompai/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { HistoryTab } from './HistoryTab';

const baselinePayload = {
  summary: {
    resolutions: 3,
    platformFixes: 1,
    externalFixes: 1,
    resourceDeleted: 1,
    exceptionMarked: 0,
    activeExceptions: 1,
    regressions: 1,
  },
  resolutions: [
    {
      id: 'fres_1',
      checkId: 'iam-no-mfa',
      resourceId: 'john',
      resourceType: 'AwsIamUser',
      resolvedAt: '2026-05-12T10:00:00Z',
      resolutionMethod: 'platform_fix',
      daysOpen: 4,
    },
    {
      id: 'fres_2',
      checkId: 's3-public',
      resourceId: 'old-backups',
      resourceType: 'S3Bucket',
      resolvedAt: '2026-05-10T10:00:00Z',
      resolutionMethod: 'external_fix',
      daysOpen: 23,
    },
    {
      id: 'fres_3',
      checkId: 'ec2-open-ssh',
      resourceId: 'sg-abc',
      resourceType: 'SecurityGroup',
      resolvedAt: '2026-05-08T10:00:00Z',
      resolutionMethod: 'resource_deleted',
      daysOpen: 5,
    },
  ],
  exceptions: [
    {
      id: 'fex_1',
      checkId: 's3-public',
      resourceId: 'marketing-assets',
      reason: 'Public marketing bucket — intentional.',
      reviewedBy: 'CISO 2026-Q1',
      expiresAt: '2026-08-13T00:00:00Z',
      markedAt: '2026-05-13T10:00:00Z',
    },
  ],
  regressions: [
    {
      id: 'freg_1',
      checkId: 'rds-not-encrypted',
      resourceId: 'prod-db-2',
      previouslyResolvedAt: '2026-03-10T10:00:00Z',
      regressedAt: '2026-04-15T10:00:00Z',
      daysClean: 36,
    },
  ],
};

describe('HistoryTab', () => {
  beforeEach(() => {
    swrMock.mockReset();
    deleteMock.mockReset();
    hasPermissionMock.mockReturnValue(true);
  });

  it('renders a loading state while the request is in flight', () => {
    swrMock.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      mutate: () => undefined,
    });
    render(<HistoryTab connectionId="icn_aws" />);
    expect(screen.getByText(/Loading history/i)).toBeInTheDocument();
  });

  it('renders an empty state when there are no resolutions, exceptions, or regressions', () => {
    swrMock.mockReturnValue({
      data: {
        data: {
          data: {
            summary: {
              resolutions: 0,
              platformFixes: 0,
              externalFixes: 0,
              resourceDeleted: 0,
              exceptionMarked: 0,
              activeExceptions: 0,
              regressions: 0,
            },
            resolutions: [],
            exceptions: [],
            regressions: [],
          },
        },
      },
      error: null,
      isLoading: false,
      mutate: () => undefined,
    });
    render(<HistoryTab connectionId="icn_aws" />);
    expect(screen.getByText(/No audit history yet/i)).toBeInTheDocument();
  });

  it('renders all three sections with sample data', () => {
    swrMock.mockReturnValue({
      data: { data: { data: baselinePayload } },
      error: null,
      isLoading: false,
      mutate: () => undefined,
    });
    render(<HistoryTab connectionId="icn_aws" />);
    // "Resolutions" and "Active exceptions" appear in both summary + section header —
    // getAllByText proves both are rendered.
    expect(screen.getAllByText(/Resolutions/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active exceptions/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Regressions/).length).toBeGreaterThan(0);
    expect(screen.getByText('Fixed via platform')).toBeInTheDocument();
    expect(screen.getByText('Fixed externally')).toBeInTheDocument();
    expect(screen.getByText('Resource deleted')).toBeInTheDocument();
    expect(
      screen.getByText(/Public marketing bucket/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/CISO 2026-Q1/i)).toBeInTheDocument();
  });

  it('calls DELETE /exceptions/:id and refreshes when "Remove exception" is clicked', async () => {
    const mutate = vi.fn();
    swrMock.mockReturnValue({
      data: { data: { data: baselinePayload } },
      error: null,
      isLoading: false,
      mutate,
    });
    deleteMock.mockResolvedValueOnce({ error: null });

    render(<HistoryTab connectionId="icn_aws" />);
    fireEvent.click(
      screen.getByRole('button', { name: /Remove exception/i }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(deleteMock).toHaveBeenCalledWith(
      '/v1/cloud-security/exceptions/fex_1',
    );
    expect(mutate).toHaveBeenCalled();
  });

  it('hides the "Remove exception" button for users without integration:update', () => {
    hasPermissionMock.mockReturnValue(false);
    swrMock.mockReturnValue({
      data: { data: { data: baselinePayload } },
      error: null,
      isLoading: false,
      mutate: () => undefined,
    });
    render(<HistoryTab connectionId="icn_aws" />);
    expect(
      screen.queryByRole('button', { name: /Remove exception/i }),
    ).not.toBeInTheDocument();
  });
});

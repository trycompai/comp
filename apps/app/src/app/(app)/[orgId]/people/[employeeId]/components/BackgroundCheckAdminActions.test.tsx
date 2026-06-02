import { apiClient } from '@/lib/api-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackgroundCheckAdminActions } from './BackgroundCheckAdminActions';
import type { BackgroundCheckRecord, BackgroundCheckStatus } from './backgroundCheckTypes';

const { mockHasPermission } = vi.hoisted(() => ({ mockHasPermission: vi.fn() }));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function record(status: BackgroundCheckStatus): BackgroundCheckRecord {
  return {
    id: 'bcr_1',
    employeeEmail: 'ada@example.com',
    employeeName: 'Ada',
    requesterNotes: null,
    candidateUrl: null,
    status,
    identityStatus: null,
    employmentStatus: null,
    referenceStatus: null,
    rightToWorkStatus: null,
    adjudicationStatus: null,
    lastSyncedAt: null,
    reportSnapshot: null,
    reportSyncedAt: null,
  };
}

function renderActions(status: BackgroundCheckStatus, onChange = vi.fn()) {
  render(
    <BackgroundCheckAdminActions
      backgroundCheck={record(status)}
      memberId="mem_1"
      organizationId="org_1"
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('BackgroundCheckAdminActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'member' && (action === 'update' || action === 'delete'),
    );
    vi.mocked(apiClient.post).mockResolvedValue({ data: record('invited'), status: 200 });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { ok: true }, status: 200 });
  });

  it('shows Retry + Delete for a failed check', () => {
    renderActions('failed');
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel check/i })).not.toBeInTheDocument();
  });

  it('shows Cancel + Delete for an in_progress check', () => {
    renderActions('in_progress');
    expect(screen.getByRole('button', { name: /Cancel check/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('renders nothing without member permissions', () => {
    mockHasPermission.mockReturnValue(false);
    const { container } = render(
      <BackgroundCheckAdminActions
        backgroundCheck={record('failed')}
        memberId="mem_1"
        organizationId="org_1"
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('retries via the API and notifies the parent', async () => {
    const user = userEvent.setup();
    const onChange = renderActions('failed');
    await user.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/v1/people/mem_1/background-check/retry',
        undefined,
        'org_1',
      );
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('requires a second confirm click before deleting', async () => {
    const user = userEvent.setup();
    const onChange = renderActions('failed');
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(apiClient.delete).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Confirm delete/i }));
    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith('/v1/people/mem_1/background-check', 'org_1');
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('clears a pending delete confirmation when Retry is clicked', async () => {
    const user = userEvent.setup();
    renderActions('failed');
    await user.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(screen.getByRole('button', { name: /Confirm delete/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Retry/i }));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
    expect(screen.queryByRole('button', { name: /Confirm delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
  });
});

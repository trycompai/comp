import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import { EvidenceTab } from './EvidenceTab';

const makeStatuses = () => ({
  'access-request': { lastSubmittedAt: '2026-01-15T00:00:00Z' },
  meeting: { lastSubmittedAt: null },
  'network-diagram': { lastSubmittedAt: '2026-02-01T00:00:00Z' },
});

describe('EvidenceTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<EvidenceTab orgId="org_1" />);
    expect(screen.getByText(/loading evidence forms/i)).toBeInTheDocument();
  });

  it('renders form types after loading', async () => {
    mockGet.mockResolvedValue({ data: makeStatuses() });
    render(<EvidenceTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText('Access Request')).toBeInTheDocument();
    });
    expect(screen.getByText('Meeting')).toBeInTheDocument();
    expect(screen.getByText('Network Diagram')).toBeInTheDocument();
  });

  it('shows "No submissions" badge for forms without submissions', async () => {
    mockGet.mockResolvedValue({ data: makeStatuses() });
    render(<EvidenceTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText('No submissions')).toBeInTheDocument();
    });
  });

  it('shows View button for each form type', async () => {
    mockGet.mockResolvedValue({ data: makeStatuses() });
    render(<EvidenceTab orgId="org_1" />);

    await waitFor(() => {
      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      expect(viewButtons).toHaveLength(3);
    });
  });

  it('navigates to form submissions on View click', async () => {
    mockGet
      .mockResolvedValueOnce({ data: makeStatuses() })
      .mockResolvedValueOnce({
        data: {
          form: { type: 'meeting', label: 'Meeting', fields: [] },
          submissions: [],
          total: 0,
        },
      });

    render(<EvidenceTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[1]);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_1/evidence-forms/meeting',
      );
    });
  });

  it('calls correct API endpoint', async () => {
    mockGet.mockResolvedValue({ data: {} });
    render(<EvidenceTab orgId="org_test" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_test/evidence-forms',
      );
    });
  });
});

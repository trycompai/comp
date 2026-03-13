import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { FindingsTab } from './FindingsTab';

const makeFindings = () => [
  {
    id: 'fnd_1',
    type: 'soc2',
    status: 'open',
    content: 'Missing evidence screenshot',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: { user: { name: 'Admin User', email: 'admin@test.com' } },
    task: { id: 'tsk_1', title: 'Upload SOC2 Report' },
    evidenceSubmission: null,
    evidenceFormType: null,
  },
  {
    id: 'fnd_2',
    type: 'soc2',
    status: 'closed',
    content: 'Org chart not up to date',
    createdAt: '2026-01-02T00:00:00Z',
    createdByAdmin: { name: 'Platform Admin', email: 'padmin@test.com' },
    evidenceFormType: 'access-request',
    task: null,
    evidenceSubmission: null,
  },
];

describe('FindingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<FindingsTab orgId="org_1" />);
    expect(screen.getByText(/loading findings/i)).toBeInTheDocument();
  });

  it('renders findings after loading', async () => {
    mockGet.mockResolvedValue({ data: makeFindings() });
    render(<FindingsTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/findings \(2\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/missing evidence screenshot/i)).toBeInTheDocument();
    expect(screen.getByText(/org chart not up to date/i)).toBeInTheDocument();
  });

  it('shows empty state when no findings', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<FindingsTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/no findings/i)).toBeInTheDocument();
    });
  });

  it('shows Log Finding button', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<FindingsTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log finding/i })).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<FindingsTab orgId="org_test" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_test/findings',
      );
    });
  });
});

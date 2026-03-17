import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { VendorsTab } from './VendorsTab';

const makeVendors = () => [
  {
    id: 'vnd_1',
    name: 'AWS',
    website: 'https://aws.amazon.com',
    status: 'active',
    category: 'Cloud Infrastructure',
    riskLevel: 'high',
    assessmentStatus: 'completed',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'vnd_2',
    name: 'Slack',
    website: null,
    status: 'active',
    category: 'Communication',
    riskLevel: 'low',
    assessmentStatus: null,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

describe('VendorsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<VendorsTab orgId="org_1" />);
    expect(screen.getByText(/loading vendors/i)).toBeInTheDocument();
  });

  it('renders vendors after loading', async () => {
    mockGet.mockResolvedValue({ data: makeVendors() });
    render(<VendorsTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText('AWS')).toBeInTheDocument();
    });
    expect(screen.getByText('Slack')).toBeInTheDocument();
  });

  it('shows empty state when no vendors', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<VendorsTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/no vendors/i)).toBeInTheDocument();
    });
  });

  it('shows Regenerate button for each vendor', async () => {
    mockGet.mockResolvedValue({ data: makeVendors() });
    render(<VendorsTab orgId="org_1" />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /regenerate/i });
      expect(buttons).toHaveLength(2);
    });
  });

  it('triggers assessment when Regenerate is clicked', async () => {
    mockGet.mockResolvedValue({ data: makeVendors() });
    mockPost.mockResolvedValue({ data: { runId: 'run_1' } });

    render(<VendorsTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText('AWS')).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button', { name: /regenerate/i });
    fireEvent.click(buttons[0]);

    expect(mockPost).toHaveBeenCalledWith(
      '/v1/admin/organizations/org_1/vendors/vnd_1/trigger-assessment',
    );
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPatch = vi.fn();
const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { PoliciesTab } from './PoliciesTab';

const makePolicies = () => [
  {
    id: 'pol_1',
    name: 'Information Security Policy',
    description: 'Main security policy',
    status: 'published',
    department: 'Engineering',
    frequency: 'yearly',
    lastPublishedAt: '2026-01-15T00:00:00Z',
    assignee: { id: 'mem_1', user: { name: 'Alice' } },
  },
  {
    id: 'pol_2',
    name: 'Acceptable Use Policy',
    description: null,
    status: 'draft',
    department: null,
    frequency: null,
    lastPublishedAt: null,
    assignee: null,
  },
];

describe('PoliciesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<PoliciesTab orgId="org_1" />);
    expect(screen.getByText(/loading policies/i)).toBeInTheDocument();
  });

  it('renders policies after loading', async () => {
    mockGet.mockResolvedValue({ data: makePolicies() });
    render(<PoliciesTab orgId="org_1" />);

    await waitFor(() => {
      expect(
        screen.getByText('Information Security Policy'),
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Acceptable Use Policy')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows empty state when no policies', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<PoliciesTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/no policies/i)).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<PoliciesTab orgId="org_test" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_test/policies',
      );
    });
  });

  it('shows Regenerate button for each policy', async () => {
    mockGet.mockResolvedValue({ data: makePolicies() });
    render(<PoliciesTab orgId="org_1" />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /regenerate/i });
      expect(buttons).toHaveLength(2);
    });
  });

  it('triggers regeneration when Regenerate is clicked', async () => {
    mockGet.mockResolvedValue({ data: makePolicies() });
    mockPost.mockResolvedValue({ data: { runId: 'run_1' } });

    render(<PoliciesTab orgId="org_1" />);

    await waitFor(() => {
      expect(
        screen.getByText('Information Security Policy'),
      ).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole('button', { name: /regenerate/i });
    fireEvent.click(buttons[0]);

    expect(mockPost).toHaveBeenCalledWith(
      '/v1/admin/organizations/org_1/policies/pol_1/regenerate',
    );
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

import { ContextTab } from './ContextTab';

const makeEntries = () => ({
  data: [
    {
      id: 'ctx_1',
      question: 'How do we handle auth?',
      answer: 'We use session-based auth with cookies.',
      tags: ['auth', 'security'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ctx_2',
      question: 'Where is data stored?',
      answer: 'PostgreSQL on AWS RDS.',
      tags: ['database'],
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ],
  count: 2,
});

describe('ContextTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<ContextTab orgId="org_1" />);
    expect(screen.getByText(/loading context/i)).toBeInTheDocument();
  });

  it('renders context entries after loading', async () => {
    mockGet.mockResolvedValue({ data: makeEntries() });
    render(<ContextTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/context \(2\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/how do we handle auth/i)).toBeInTheDocument();
    expect(screen.getByText(/where is data stored/i)).toBeInTheDocument();
  });

  it('shows empty state when no entries', async () => {
    mockGet.mockResolvedValue({ data: { data: [], count: 0 } });
    render(<ContextTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/no context entries/i)).toBeInTheDocument();
    });
  });

  it('shows Add Context button', async () => {
    mockGet.mockResolvedValue({ data: { data: [], count: 0 } });
    render(<ContextTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add context/i })).toBeInTheDocument();
    });
  });

  it('shows Edit buttons for each entry', async () => {
    mockGet.mockResolvedValue({ data: makeEntries() });
    render(<ContextTab orgId="org_1" />);

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      expect(editButtons).toHaveLength(2);
    });
  });

  it('calls correct API endpoint', async () => {
    mockGet.mockResolvedValue({ data: { data: [], count: 0 } });
    render(<ContextTab orgId="org_test" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_test/context',
      );
    });
  });
});

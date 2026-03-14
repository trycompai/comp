import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import { TasksTab } from './TasksTab';

const makeTasks = () => ({
  data: [
    {
      id: 'tsk_1',
      title: 'Upload SOC2 Report',
      status: 'todo',
      department: 'Engineering',
      assigneeId: 'mem_1',
      frequency: 'annual',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'tsk_2',
      title: 'Review Access Controls',
      status: 'done',
      department: null,
      assigneeId: null,
      frequency: null,
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ],
  count: 2,
});

describe('TasksTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<TasksTab orgId="org_1" />);
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
  });

  it('renders tasks after loading', async () => {
    mockGet.mockResolvedValue({ data: makeTasks() });
    render(<TasksTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/tasks \(2\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Upload SOC2 Report')).toBeInTheDocument();
    expect(screen.getByText('Review Access Controls')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', async () => {
    mockGet.mockResolvedValue({ data: { data: [], count: 0 } });
    render(<TasksTab orgId="org_1" />);

    await waitFor(() => {
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
    });
  });

  it('calls correct API endpoint', async () => {
    mockGet.mockResolvedValue({ data: { data: [], count: 0 } });
    render(<TasksTab orgId="org_test" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_test/tasks',
      );
    });
  });
});

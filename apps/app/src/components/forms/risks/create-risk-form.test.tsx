import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    post: mockPost,
    organizationId: 'org_123',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

import { toast } from 'sonner';
import { CreateRisk } from './create-risk-form';

const assignees: any[] = [];

describe('CreateRisk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create risk form', () => {
    render(<CreateRisk assignees={assignees} />);
    expect(screen.getByLabelText(/risk title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('calls api.post on submit and shows success toast', async () => {
    mockPost.mockResolvedValue({ data: { id: 'risk_new' }, status: 201 });
    const onSuccess = vi.fn();

    render(<CreateRisk assignees={assignees} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/risk title/i), {
      target: { value: 'Test Risk' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test description' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/v1/risks',
        expect.objectContaining({
          title: 'Test Risk',
          description: 'Test description',
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Risk created successfully');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on api failure', async () => {
    mockPost.mockResolvedValue({ error: 'Server error', status: 500 });

    render(<CreateRisk assignees={assignees} />);

    fireEvent.change(screen.getByLabelText(/risk title/i), {
      target: { value: 'Test Risk' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test description' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create risk');
    });
  });
});

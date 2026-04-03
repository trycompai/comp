import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();
const mockPatch = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    post: mockPost,
    patch: mockPatch,
    organizationId: 'org_123',
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { ContextForm } from './context-form';

describe('ContextForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form when no entry is provided', () => {
    render(<ContextForm />);
    expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/answer/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('renders update form when entry is provided', () => {
    const entry = {
      id: 'ctx_1',
      question: 'What is X?',
      answer: 'X is Y',
      tags: [],
      organizationId: 'org_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<ContextForm entry={entry} />);
    expect(screen.getByDisplayValue('What is X?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('X is Y')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('calls api.post for new entries and shows success toast', async () => {
    mockPost.mockResolvedValue({ data: { id: 'ctx_new' }, status: 201 });
    const onSuccess = vi.fn();

    render(<ContextForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/question/i), {
      target: { value: 'New question?' },
    });
    fireEvent.change(screen.getByLabelText(/answer/i), {
      target: { value: 'New answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/v1/context', {
        question: 'New question?',
        answer: 'New answer',
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Context entry created');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls api.patch for existing entries and shows success toast', async () => {
    mockPatch.mockResolvedValue({ data: {}, status: 200 });
    const onSuccess = vi.fn();

    const entry = {
      id: 'ctx_1',
      question: 'Old question',
      answer: 'Old answer',
      tags: [],
      organizationId: 'org_123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<ContextForm entry={entry} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByDisplayValue('Old answer'), {
      target: { value: 'Updated answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/v1/context/ctx_1', {
        question: 'Old question',
        answer: 'Updated answer',
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Context entry updated');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on api failure', async () => {
    mockPost.mockResolvedValue({ error: 'Server error', status: 500 });

    render(<ContextForm />);

    fireEvent.change(screen.getByLabelText(/question/i), {
      target: { value: 'Question' },
    });
    fireEvent.change(screen.getByLabelText(/answer/i), {
      target: { value: 'Answer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { TaskForm } from './TaskForm';

describe('TaskForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with required fields', () => {
    render(<TaskForm orgId="org_1" onCreated={onCreated} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
  });

  it('disables submit when required fields are empty', () => {
    render(<TaskForm orgId="org_1" onCreated={onCreated} />);

    const submitButton = screen.getByRole('button', { name: /create task/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit when only title is provided', () => {
    render(<TaskForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'My Task' },
    });

    expect(screen.getByRole('button', { name: /create task/i })).toBeDisabled();
  });

  it('enables submit when both title and description are provided', () => {
    render(<TaskForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'My Task' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Task description' },
    });

    expect(screen.getByRole('button', { name: /create task/i })).not.toBeDisabled();
  });

  it('calls the API and onCreated on successful submit', async () => {
    mockPost.mockResolvedValue({ data: { id: 'tsk_new' } });
    render(<TaskForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Review Controls' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Review all access controls' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_1/tasks',
        { title: 'Review Controls', description: 'Review all access controls' },
      );
    });

    expect(onCreated).toHaveBeenCalled();
  });

  it('shows error on API failure', async () => {
    mockPost.mockResolvedValue({ error: 'Server error' });
    render(<TaskForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Bad Task' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'This will fail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });

    expect(onCreated).not.toHaveBeenCalled();
  });
});

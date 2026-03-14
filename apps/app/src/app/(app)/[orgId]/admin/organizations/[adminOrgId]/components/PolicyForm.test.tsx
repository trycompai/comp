import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { PolicyForm } from './PolicyForm';

describe('PolicyForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with required fields', () => {
    render(<PolicyForm orgId="org_1" onCreated={onCreated} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create policy/i })).toBeInTheDocument();
  });

  it('disables submit when name is empty', () => {
    render(<PolicyForm orgId="org_1" onCreated={onCreated} />);

    const submitButton = screen.getByRole('button', { name: /create policy/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit when name is provided', () => {
    render(<PolicyForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Test Policy' },
    });

    const submitButton = screen.getByRole('button', { name: /create policy/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls the API and onCreated on successful submit', async () => {
    mockPost.mockResolvedValue({ data: { id: 'pol_new' } });
    render(<PolicyForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'New Security Policy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create policy/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_1/policies',
        { name: 'New Security Policy' },
      );
    });

    expect(onCreated).toHaveBeenCalled();
  });

  it('shows error on API failure', async () => {
    mockPost.mockResolvedValue({ error: 'Validation failed' });
    render(<PolicyForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Bad Policy' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create policy/i }));

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
    });

    expect(onCreated).not.toHaveBeenCalled();
  });
});

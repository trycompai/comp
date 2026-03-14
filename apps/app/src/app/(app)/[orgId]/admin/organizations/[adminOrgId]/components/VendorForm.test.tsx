import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { VendorForm } from './VendorForm';

describe('VendorForm', () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with required fields', () => {
    render(<VendorForm orgId="org_1" onCreated={onCreated} />);

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create vendor/i })).toBeInTheDocument();
  });

  it('disables submit when required fields are empty', () => {
    render(<VendorForm orgId="org_1" onCreated={onCreated} />);

    const submitButton = screen.getByRole('button', { name: /create vendor/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit when only name is provided', () => {
    render(<VendorForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Acme Corp' },
    });

    expect(screen.getByRole('button', { name: /create vendor/i })).toBeDisabled();
  });

  it('enables submit when both name and description are provided', () => {
    render(<VendorForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Acme Corp' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Cloud provider' },
    });

    expect(screen.getByRole('button', { name: /create vendor/i })).not.toBeDisabled();
  });

  it('calls the API and onCreated on successful submit', async () => {
    mockPost.mockResolvedValue({ data: { id: 'vnd_new' } });
    render(<VendorForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'CloudTech' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Infrastructure provider' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create vendor/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_1/vendors',
        { name: 'CloudTech', description: 'Infrastructure provider' },
      );
    });

    expect(onCreated).toHaveBeenCalled();
  });

  it('shows error on API failure', async () => {
    mockPost.mockResolvedValue({ error: 'Duplicate vendor' });
    render(<VendorForm orgId="org_1" onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: 'Bad Vendor' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'This will fail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create vendor/i }));

    await waitFor(() => {
      expect(screen.getByText(/duplicate vendor/i)).toBeInTheDocument();
    });

    expect(onCreated).not.toHaveBeenCalled();
  });
});

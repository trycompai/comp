import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPatch = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
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
import { UpdateOrganizationName } from './update-organization-name';

describe('UpdateOrganizationName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the current organization name', () => {
    render(<UpdateOrganizationName organizationName="Acme Corp" />);
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
  });

  it('calls api.patch on submit and shows success toast', async () => {
    mockPatch.mockResolvedValue({ data: { name: 'New Name' }, status: 200 });

    render(<UpdateOrganizationName organizationName="Acme Corp" />);

    const input = screen.getByDisplayValue('Acme Corp');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/v1/organization', { name: 'New Name' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Organization name updated');
    });
  });

  it('shows error toast when api returns error', async () => {
    mockPatch.mockResolvedValue({ error: 'Forbidden', status: 403 });

    render(<UpdateOrganizationName organizationName="Acme Corp" />);

    const input = screen.getByDisplayValue('Acme Corp');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error updating organization name');
    });
  });

  it('disables the submit button while submitting', async () => {
    let resolvePromise: (value: unknown) => void;
    mockPatch.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(<UpdateOrganizationName organizationName="Acme Corp" />);

    const input = screen.getByDisplayValue('Acme Corp');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    resolvePromise!({ data: {}, status: 200 });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
    });
  });
});

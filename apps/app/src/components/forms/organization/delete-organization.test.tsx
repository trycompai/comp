import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDelete = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    delete: mockDelete,
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
import { DeleteOrganization } from './delete-organization';

describe('DeleteOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render for non-owners', () => {
    const { container } = render(
      <DeleteOrganization organizationId="org_123" isOwner={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders for owners', () => {
    render(<DeleteOrganization organizationId="org_123" isOwner={true} />);
    expect(screen.getByText('Delete organization')).toBeInTheDocument();
  });

  it('requires typing "delete" to enable the confirm button', () => {
    render(<DeleteOrganization organizationId="org_123" isOwner={true} />);

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    // Confirm button should be disabled
    const confirmButton = screen.getAllByRole('button', { name: /delete/i }).pop()!;
    expect(confirmButton).toBeDisabled();

    // Type 'delete'
    const input = screen.getByLabelText(/type 'delete' to confirm/i);
    fireEvent.change(input, { target: { value: 'delete' } });

    expect(confirmButton).not.toBeDisabled();
  });

  it('calls api.delete and shows success toast', async () => {
    mockDelete.mockResolvedValue({ data: {}, status: 200 });

    render(<DeleteOrganization organizationId="org_123" isOwner={true} />);

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    // Type confirmation
    const input = screen.getByLabelText(/type 'delete' to confirm/i);
    fireEvent.change(input, { target: { value: 'delete' } });

    // Click confirm
    const confirmButton = screen.getAllByRole('button', { name: /delete/i }).pop()!;
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/v1/organization');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Organization deleted');
    });
  });

  it('shows error toast when delete fails', async () => {
    mockDelete.mockResolvedValue({ error: 'Forbidden', status: 403 });

    render(<DeleteOrganization organizationId="org_123" isOwner={true} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    const input = screen.getByLabelText(/type 'delete' to confirm/i);
    fireEvent.change(input, { target: { value: 'delete' } });

    const confirmButton = screen.getAllByRole('button', { name: /delete/i }).pop()!;
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error deleting organization');
    });
  });
});

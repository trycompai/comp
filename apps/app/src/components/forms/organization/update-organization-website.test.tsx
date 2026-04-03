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
import { UpdateOrganizationWebsite } from './update-organization-website';

describe('UpdateOrganizationWebsite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with the current website', () => {
    render(<UpdateOrganizationWebsite organizationWebsite="https://acme.com" />);
    expect(screen.getByDisplayValue('https://acme.com')).toBeInTheDocument();
  });

  it('calls api.patch on submit and shows success toast', async () => {
    mockPatch.mockResolvedValue({ data: { website: 'https://new.com' }, status: 200 });

    render(<UpdateOrganizationWebsite organizationWebsite="https://acme.com" />);

    const input = screen.getByDisplayValue('https://acme.com');
    fireEvent.change(input, { target: { value: 'https://new.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/v1/organization', {
        website: 'https://new.com',
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Organization website updated');
    });
  });

  it('shows error toast when api returns error', async () => {
    mockPatch.mockResolvedValue({ error: 'Forbidden', status: 403 });

    render(<UpdateOrganizationWebsite organizationWebsite="https://acme.com" />);

    const input = screen.getByDisplayValue('https://acme.com');
    fireEvent.change(input, { target: { value: 'https://new.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error updating organization website');
    });
  });
});

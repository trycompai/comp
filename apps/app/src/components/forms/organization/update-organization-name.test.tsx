import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

const mockUpdateOrganization = vi.fn();

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/hooks/use-organization-mutations', () => ({
  useOrganizationMutations: () => ({
    updateOrganization: mockUpdateOrganization,
  }),
}));

vi.mock('@/actions/schema', async () => {
  const { z } = await import('zod');
  return {
    organizationNameSchema: z.object({
      name: z.string().min(1).max(255),
    }),
  };
});

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
    setMockPermissions(ADMIN_PERMISSIONS);
  });

  it('renders with the current organization name', () => {
    render(<UpdateOrganizationName organizationName="Acme Corp" />);
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
  });

  it('calls updateOrganization on submit and shows success toast', async () => {
    mockUpdateOrganization.mockResolvedValue({ name: 'New Name' });

    render(<UpdateOrganizationName organizationName="Acme Corp" />);

    const input = screen.getByDisplayValue('Acme Corp');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateOrganization).toHaveBeenCalledWith({ name: 'New Name' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Organization name updated');
    });
  });

  it('shows error toast when mutation throws', async () => {
    mockUpdateOrganization.mockRejectedValue(new Error('Forbidden'));

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
    mockUpdateOrganization.mockReturnValue(
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

    resolvePromise!({ name: 'New Name' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
    });
  });

  describe('permission gating', () => {
    it('disables Save button when user lacks organization:update permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);
      render(<UpdateOrganizationName organizationName="Acme Corp" />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('enables Save button when user has organization:update permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);
      render(<UpdateOrganizationName organizationName="Acme Corp" />);
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
    });

    it('disables Save button when user has no permissions', () => {
      setMockPermissions({});
      render(<UpdateOrganizationName organizationName="Acme Corp" />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useOrganizationMutations
vi.mock('@/hooks/use-organization-mutations', () => ({
  useOrganizationMutations: () => ({
    uploadLogo: vi.fn(),
    removeLogo: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string; src: string }) => (
    <img alt={alt} {...props} />
  ),
}));

import { UpdateOrganizationLogo } from './update-organization-logo';

describe('UpdateOrganizationLogo permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables upload button when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdateOrganizationLogo currentLogoUrl={null} />);

    const uploadButton = screen.getByRole('button', { name: /upload logo/i });
    expect(uploadButton).toBeDisabled();
  });

  it('disables upload button when user has no permissions', () => {
    setMockPermissions({});

    render(<UpdateOrganizationLogo currentLogoUrl={null} />);

    const uploadButton = screen.getByRole('button', { name: /upload logo/i });
    expect(uploadButton).toBeDisabled();
  });

  it('enables upload button when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdateOrganizationLogo currentLogoUrl={null} />);

    const uploadButton = screen.getByRole('button', { name: /upload logo/i });
    expect(uploadButton).not.toBeDisabled();
  });

  it('shows remove button when logo exists and disables it without permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(
      <UpdateOrganizationLogo currentLogoUrl="https://example.com/logo.png" />,
    );

    const removeButton = screen.getByRole('button', { name: /remove/i });
    expect(removeButton).toBeDisabled();
  });

  it('shows remove button when logo exists and enables it with permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <UpdateOrganizationLogo currentLogoUrl="https://example.com/logo.png" />,
    );

    const removeButton = screen.getByRole('button', { name: /remove/i });
    expect(removeButton).not.toBeDisabled();
  });

  it('renders the Organization Logo title regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdateOrganizationLogo currentLogoUrl={null} />);

    expect(screen.getByText('Organization Logo')).toBeInTheDocument();
  });
});

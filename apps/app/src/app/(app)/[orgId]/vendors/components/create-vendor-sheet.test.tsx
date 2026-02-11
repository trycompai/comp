import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useMediaQuery to default to desktop
vi.mock('@comp/ui/hooks', () => ({
  useMediaQuery: vi.fn(() => true),
}));

// Mock the CreateVendorForm component
vi.mock('./create-vendor-form', () => ({
  CreateVendorForm: () => (
    <div data-testid="create-vendor-form">Create Vendor Form</div>
  ),
}));

// Mock design system components
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <div>{children}</div>,
  SheetBody: ({ children }: any) => <div>{children}</div>,
  ScrollArea: ({ children }: any) => <div>{children}</div>,
  Drawer: ({ children }: any) => <div>{children}</div>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <div>{children}</div>,
}));

// Mock design system icons
vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
}));

import { CreateVendorSheet } from './create-vendor-sheet';

const mockAssignees: any[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: 'admin',
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  },
];

describe('CreateVendorSheet', () => {
  beforeEach(() => {
    setMockPermissions({});
  });

  it('returns null when user lacks vendor:create permission', () => {
    setMockPermissions({});

    const { container } = render(
      <CreateVendorSheet assignees={mockAssignees} organizationId="org-1" />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('returns null for auditor without vendor:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    const { container } = render(
      <CreateVendorSheet assignees={mockAssignees} organizationId="org-1" />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the Add Vendor button when user has vendor:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <CreateVendorSheet assignees={mockAssignees} organizationId="org-1" />,
    );

    expect(
      screen.getByRole('button', { name: /add vendor/i }),
    ).toBeInTheDocument();
  });

  it('renders trigger with correct text for vendor:create permission only', () => {
    setMockPermissions({ vendor: ['create'] });

    render(
      <CreateVendorSheet assignees={mockAssignees} organizationId="org-1" />,
    );

    expect(screen.getByText('Add Vendor')).toBeInTheDocument();
  });
});

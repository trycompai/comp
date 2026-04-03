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

// Mock useVendor and useVendorActions
const mockRefreshVendor = vi.fn();
const mockTriggerAssessment = vi.fn();
const mockRegenerateMitigation = vi.fn();
vi.mock('@/hooks/use-vendors', () => ({
  useVendor: () => ({
    data: null,
    mutate: mockRefreshVendor,
  }),
  useVendorActions: () => ({
    triggerAssessment: mockTriggerAssessment,
    regenerateMitigation: mockRegenerateMitigation,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock design system components
vi.mock('@trycompai/design-system', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <button data-testid="vendor-actions-trigger" {...props}>
      {children}
    </button>
  ),
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children }: any) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

// Mock design system icons
vi.mock('@trycompai/design-system/icons', () => ({
  Edit: () => <span data-testid="edit-icon" />,
  OverflowMenuVertical: () => <span data-testid="overflow-icon" />,
  Renew: () => <span data-testid="renew-icon" />,
}));

import { VendorActions } from './VendorActions';

const mockOnOpenEditSheet = vi.fn();

describe('VendorActions', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('returns null when user lacks vendor:update permission', () => {
    setMockPermissions({});

    const { container } = render(
      <VendorActions
        vendorId="vendor-1"
        onOpenEditSheet={mockOnOpenEditSheet}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('returns null for auditor without vendor:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    const { container } = render(
      <VendorActions
        vendorId="vendor-1"
        onOpenEditSheet={mockOnOpenEditSheet}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the dropdown trigger when user has vendor:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <VendorActions
        vendorId="vendor-1"
        onOpenEditSheet={mockOnOpenEditSheet}
      />,
    );

    expect(screen.getByTestId('vendor-actions-trigger')).toBeInTheDocument();
  });

  it('renders Edit, Mitigation, and Assessment menu items when permitted', () => {
    setMockPermissions({ vendor: ['create', 'read', 'update', 'delete'] });

    render(
      <VendorActions
        vendorId="vendor-1"
        onOpenEditSheet={mockOnOpenEditSheet}
      />,
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Mitigation')).toBeInTheDocument();
    expect(screen.getByText('Assessment')).toBeInTheDocument();
  });
});

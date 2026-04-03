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

// Mock useVendors and useVendorActions
const mockDeleteVendor = vi.fn();
vi.mock('@/hooks/use-vendors', () => ({
  useVendors: () => ({ data: null }),
  useVendorActions: () => ({
    deleteVendor: mockDeleteVendor,
  }),
}));

// Mock useOnboardingStatus
vi.mock('../hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({
    itemStatuses: {},
    progress: null,
    itemsInfo: [],
    isActive: false,
    isLoading: false,
  }),
}));

// Mock vendor-onboarding-context
vi.mock('./vendor-onboarding-context', () => ({
  VendorOnboardingProvider: ({ children }: any) => <div>{children}</div>,
  useVendorOnboardingStatus: () => ({}),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock OnboardingLoadingAnimation
vi.mock('@/components/onboarding-loading-animation', () => ({
  OnboardingLoadingAnimation: () => <div data-testid="onboarding-loading" />,
}));

// Mock VendorStatus
vi.mock('@/components/vendor-status', () => ({
  VendorStatus: ({ status }: any) => (
    <span data-testid="vendor-status">{status}</span>
  ),
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: () => null,
  Badge: ({ children }: any) => <span>{children}</span>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <button data-testid="actions-trigger" {...props}>
      {children}
    </button>
  ),
  Empty: ({ children }: any) => <div data-testid="empty-state">{children}</div>,
  EmptyDescription: ({ children }: any) => <p>{children}</p>,
  EmptyHeader: ({ children }: any) => <div>{children}</div>,
  EmptyTitle: ({ children }: any) => <h3>{children}</h3>,
  HStack: ({ children }: any) => <div>{children}</div>,
  InputGroup: ({ children }: any) => <div>{children}</div>,
  InputGroupAddon: ({ children }: any) => <div>{children}</div>,
  InputGroupInput: (props: any) => <input {...props} />,
  Spinner: () => <span data-testid="spinner" />,
  Stack: ({ children }: any) => <div>{children}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

// Mock design system icons
vi.mock('@trycompai/design-system/icons', () => ({
  OverflowMenuVertical: () => <span data-testid="overflow-icon" />,
  Search: () => <span data-testid="search-icon" />,
  TrashCan: () => <span data-testid="trash-icon" />,
}));

import { VendorsTable } from './VendorsTable';

const mockVendors: any[] = [
  {
    id: 'vendor-1',
    name: 'Acme Corp',
    description: 'A vendor',
    category: 'cloud',
    status: 'assessed',
    inherentProbability: 'possible',
    inherentImpact: 'moderate',
    residualProbability: 'unlikely',
    residualImpact: 'minor',
    website: null,
    isSubProcessor: false,
    logoUrl: null,
    showOnTrustPortal: false,
    trustPortalOrder: null,
    complianceBadges: null,
    organizationId: 'org-1',
    assigneeId: null,
    assignee: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockAssignees: any[] = [];

describe('VendorsTable', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('does not render ACTIONS column when user lacks vendor:delete permission', () => {
    setMockPermissions({});

    render(
      <VendorsTable
        vendors={mockVendors}
        assignees={mockAssignees}
        orgId="org-1"
      />,
    );

    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('does not render ACTIONS column for auditor role', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(
      <VendorsTable
        vendors={mockVendors}
        assignees={mockAssignees}
        orgId="org-1"
      />,
    );

    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('renders ACTIONS column when user has vendor:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <VendorsTable
        vendors={mockVendors}
        assignees={mockAssignees}
        orgId="org-1"
      />,
    );

    expect(screen.getByText('ACTIONS')).toBeInTheDocument();
  });

  it('renders delete action trigger per row when user has vendor:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <VendorsTable
        vendors={mockVendors}
        assignees={mockAssignees}
        orgId="org-1"
      />,
    );

    expect(screen.getAllByTestId('actions-trigger').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render delete action trigger when user lacks vendor:delete permission', () => {
    setMockPermissions({ vendor: ['read'] });

    render(
      <VendorsTable
        vendors={mockVendors}
        assignees={mockAssignees}
        orgId="org-1"
      />,
    );

    expect(screen.queryByTestId('actions-trigger')).not.toBeInTheDocument();
  });

  it('renders vendor name and category regardless of permissions', () => {
    setMockPermissions({});

    render(
      <VendorsTable
        vendors={mockVendors}
        assignees={mockAssignees}
        orgId="org-1"
      />,
    );

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });
});

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

// Mock useRisk hook
const mockRefreshRisk = vi.fn();
vi.mock('@/hooks/use-risks', () => ({
  useRisk: () => ({
    data: null,
    mutate: mockRefreshRisk,
  }),
}));

// Mock useSWRConfig
const mockGlobalMutate = vi.fn();
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: mockGlobalMutate,
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
    <button data-testid="risk-actions-trigger" {...props}>
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
  Settings: () => <span data-testid="settings-icon" />,
}));

import { RiskActions } from './RiskActions';

describe('RiskActions', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('returns null when user lacks risk:update permission', () => {
    setMockPermissions({});

    const { container } = render(
      <RiskActions riskId="risk-1" orgId="org-1" />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('returns null for auditor without risk:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    const { container } = render(
      <RiskActions riskId="risk-1" orgId="org-1" />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the dropdown trigger when user has risk:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RiskActions riskId="risk-1" orgId="org-1" />);

    expect(screen.getByTestId('risk-actions-trigger')).toBeInTheDocument();
  });

  it('renders the Regenerate Risk Mitigation menu item when permitted', () => {
    setMockPermissions({ risk: ['create', 'read', 'update', 'delete'] });

    render(<RiskActions riskId="risk-1" orgId="org-1" />);

    expect(
      screen.getByText('Regenerate Risk Mitigation'),
    ).toBeInTheDocument();
  });
});

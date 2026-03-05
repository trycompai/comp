import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@comp/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open }: any) => (
    <div data-testid="dropdown-menu" data-open={open}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick} role="menuitem">
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MoreVertical: () => <span data-testid="more-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}));

// Mock ControlDeleteDialog
vi.mock('./ControlDeleteDialog', () => ({
  ControlDeleteDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="delete-dialog">Delete Dialog</div> : null,
}));

import { ControlHeaderActions } from './ControlHeaderActions';

const mockControl = {
  id: 'ctrl-1',
  name: 'Access Control',
  description: 'Test control',
  organizationId: 'org-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastUpdatedBy: null,
  projectId: null,
} as any;

describe('ControlHeaderActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('renders dropdown menu when user has control:delete permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      const { container } = render(
        <ControlHeaderActions control={mockControl} />,
      );

      expect(container.innerHTML).not.toBe('');
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    });

    it('returns null when user lacks control:delete permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      const { container } = render(
        <ControlHeaderActions control={mockControl} />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('returns null when user has no permissions at all', () => {
      setMockPermissions(NO_PERMISSIONS);

      const { container } = render(
        <ControlHeaderActions control={mockControl} />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('checks the correct resource and action for delete permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlHeaderActions control={mockControl} />);

      expect(mockHasPermission).toHaveBeenCalledWith('control', 'delete');
    });
  });

  describe('Rendering with delete permission', () => {
    it('renders the delete menu item inside the dropdown', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlHeaderActions control={mockControl} />);

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('renders the more actions trigger button', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlHeaderActions control={mockControl} />);

      expect(screen.getByTestId('more-icon')).toBeInTheDocument();
    });
  });
});

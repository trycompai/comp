import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useControls hook
const mockDeleteControl = vi.fn();
vi.mock('../../hooks/useControls', () => ({
  useControls: () => ({
    deleteControl: mockDeleteControl,
    controls: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createControl: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@comp/ui/form', () => ({
  Form: ({ children, ...props }: any) => (
    <div data-testid="form-provider" {...props}>
      {children}
    </div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon" />,
}));

import { ControlDeleteDialog } from './ControlDeleteDialog';

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

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  control: mockControl,
};

describe('ControlDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('enables the delete button when user has control:delete permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlDeleteDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it('disables the delete button when user lacks control:delete permission (auditor)', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<ControlDeleteDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });

    it('disables the delete button when user has no permissions', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<ControlDeleteDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlDeleteDialog {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('control', 'delete');
    });
  });

  describe('Rendering', () => {
    it('renders dialog title and description', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlDeleteDialog {...defaultProps} />);

      expect(screen.getByText('Delete Control')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete this control/i),
      ).toBeInTheDocument();
    });

    it('renders the cancel button that is always enabled', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<ControlDeleteDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeDisabled();
    });

    it('does not render when isOpen is false', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <ControlDeleteDialog {...defaultProps} isOpen={false} />,
      );

      expect(screen.queryByText('Delete Control')).not.toBeInTheDocument();
    });
  });
});

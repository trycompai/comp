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

// Mock useFrameworks hook
const mockDeleteFramework = vi.fn();
vi.mock('../../hooks/useFrameworks', () => ({
  useFrameworks: () => ({
    deleteFramework: mockDeleteFramework,
    frameworks: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    addFrameworks: vi.fn(),
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

import { FrameworkDeleteDialog } from './FrameworkDeleteDialog';

const mockFrameworkInstance = {
  id: 'fi-1',
  organizationId: 'org-1',
  frameworkId: 'fw-1',
  framework: {
    id: 'fw-1',
    name: 'SOC 2',
    description: 'SOC 2 Type II compliance framework',
  },
  controls: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
} as any;

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  frameworkInstance: mockFrameworkInstance,
};

describe('FrameworkDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('enables the delete button when user has framework:delete permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<FrameworkDeleteDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it('disables the delete button when user lacks framework:delete permission (auditor)', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<FrameworkDeleteDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });

    it('disables the delete button when user has no permissions', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<FrameworkDeleteDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeDisabled();
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<FrameworkDeleteDialog {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('framework', 'delete');
    });
  });

  describe('Rendering', () => {
    it('renders dialog title and description', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<FrameworkDeleteDialog {...defaultProps} />);

      expect(screen.getByText('Delete Framework')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete this framework/i),
      ).toBeInTheDocument();
    });

    it('renders the cancel button that is always enabled', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<FrameworkDeleteDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).not.toBeDisabled();
    });

    it('does not render when isOpen is false', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <FrameworkDeleteDialog {...defaultProps} isOpen={false} />,
      );

      expect(screen.queryByText('Delete Framework')).not.toBeInTheDocument();
    });
  });
});

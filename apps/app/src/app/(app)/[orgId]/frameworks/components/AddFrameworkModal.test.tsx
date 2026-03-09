import { fireEvent, render, screen } from '@testing-library/react';
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
const mockAddFrameworks = vi.fn();
vi.mock('../hooks/useFrameworks', () => ({
  useFrameworks: () => ({
    addFrameworks: mockAddFrameworks,
    frameworks: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    deleteFramework: vi.fn(),
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
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

// Mock FrameworkCard
vi.mock('@/components/framework-card', () => ({
  FrameworkCard: ({ framework, isSelected, onSelectionChange }: any) => (
    <div data-testid={`framework-card-${framework.id}`}>
      <label>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelectionChange(e.target.checked)}
          data-testid={`framework-checkbox-${framework.id}`}
        />
        {framework.name}
      </label>
    </div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon" />,
}));

import { AddFrameworkModal } from './AddFrameworkModal';

const mockAvailableFrameworks = [
  {
    id: 'fw-1',
    name: 'SOC 2',
    description: 'SOC 2 Type II',
    version: '1.0',
    visible: true,
  },
  {
    id: 'fw-2',
    name: 'ISO 27001',
    description: 'ISO 27001:2022',
    version: '2022',
    visible: true,
  },
];

const defaultProps = {
  onOpenChange: vi.fn(),
  availableFrameworks: mockAvailableFrameworks,
  organizationId: 'org-1',
};

describe('AddFrameworkModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('enables the "Add Selected" button when user has framework:create permission and frameworks selected', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      // Select a framework first (button is also disabled when nothing is selected)
      const checkbox = screen.getByTestId('framework-checkbox-fw-1');
      fireEvent.click(checkbox);

      const addButton = screen.getByRole('button', { name: /add selected/i });
      expect(addButton).not.toBeDisabled();
    });

    it('disables the "Add Selected" button when user lacks framework:create permission (auditor)', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      // Select a framework so the only reason for disabled is permission
      const checkbox = screen.getByTestId('framework-checkbox-fw-1');
      fireEvent.click(checkbox);

      const addButton = screen.getByRole('button', { name: /add selected/i });
      expect(addButton).toBeDisabled();
    });

    it('disables the "Add Selected" button when user has no permissions', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      const checkbox = screen.getByTestId('framework-checkbox-fw-1');
      fireEvent.click(checkbox);

      const addButton = screen.getByRole('button', { name: /add selected/i });
      expect(addButton).toBeDisabled();
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('framework', 'create');
    });
  });

  describe('Rendering', () => {
    it('renders modal title and description', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      expect(screen.getByText('Add Frameworks')).toBeInTheDocument();
      expect(
        screen.getByText(/select the compliance frameworks/i),
      ).toBeInTheDocument();
    });

    it('renders available framework cards', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      expect(screen.getByText('SOC 2')).toBeInTheDocument();
      expect(screen.getByText('ISO 27001')).toBeInTheDocument();
    });

    it('shows empty state when no frameworks available', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <AddFrameworkModal
          {...defaultProps}
          availableFrameworks={[]}
        />,
      );

      expect(
        screen.getByText(/all available frameworks are already enabled/i),
      ).toBeInTheDocument();
    });

    it('disables "Add Selected" button when nothing is selected even with permissions', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AddFrameworkModal {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add selected/i });
      expect(addButton).toBeDisabled();
    });
  });
});

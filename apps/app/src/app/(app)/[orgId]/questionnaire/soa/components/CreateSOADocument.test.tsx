import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock createSOADocument
const mockCreateSOADocument = vi.fn();
vi.mock('../../hooks/useSOADocument', () => ({
  createSOADocument: (...args: any[]) => mockCreateSOADocument(...args),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui', () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { CreateSOADocument } from './CreateSOADocument';

const defaultProps = {
  frameworkId: 'fw-1',
  frameworkName: 'ISO 27001',
  organizationId: 'org-1',
};

describe('CreateSOADocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('renders Create Document button when user has questionnaire:create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<CreateSOADocument {...defaultProps} />);

      expect(screen.getByText('Create Document')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('does not render Create Document button when user lacks questionnaire:create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<CreateSOADocument {...defaultProps} />);

      expect(screen.queryByText('Create Document')).not.toBeInTheDocument();
    });

    it('does not render Create Document button when user has no permissions at all', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<CreateSOADocument {...defaultProps} />);

      expect(screen.queryByText('Create Document')).not.toBeInTheDocument();
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<CreateSOADocument {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('questionnaire', 'create');
    });

    it('still renders the framework name and description without create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<CreateSOADocument {...defaultProps} />);

      expect(screen.getByText('ISO 27001')).toBeInTheDocument();
      expect(
        screen.getByText('Create a new SOA document for this framework'),
      ).toBeInTheDocument();
    });

    it('renders inside a card component', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<CreateSOADocument {...defaultProps} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });
});

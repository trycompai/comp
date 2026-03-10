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

// Mock integration platform hooks
const mockStartOAuth = vi.fn();
vi.mock('@/hooks/use-integration-platform', () => ({
  useIntegrationProviders: () => ({
    providers: [
      {
        id: 'github',
        name: 'GitHub',
        description: 'Code hosting',
        category: 'Development',
        logoUrl: '/github.png',
        authType: 'oauth2',
        oauthConfigured: true,
        isActive: true,
        requiredVariables: [],
        mappedTasks: [],
        supportsMultipleConnections: false,
      },
    ],
    isLoading: false,
  }),
  useIntegrationConnections: () => ({
    connections: [],
    isLoading: false,
    refresh: vi.fn(),
  }),
  useIntegrationMutations: () => ({
    startOAuth: mockStartOAuth,
  }),
}));

// Mock integrations data
vi.mock('../data/integrations', () => ({
  CATEGORIES: ['Development'],
  INTEGRATIONS: [],
}));

// Mock sibling components
vi.mock('./SearchInput', () => ({
  SearchInput: (props: any) => (
    <input
      data-testid="search-input"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
    />
  ),
}));

vi.mock('./TaskCard', () => ({
  TaskCard: () => <div data-testid="task-card" />,
  TaskCardSkeleton: () => <div data-testid="task-card-skeleton" />,
}));

// Mock dialogs
vi.mock('@/components/integrations/ConnectIntegrationDialog', () => ({
  ConnectIntegrationDialog: () => <div data-testid="connect-dialog" />,
}));

vi.mock('@/components/integrations/ManageIntegrationDialog', () => ({
  ManageIntegrationDialog: () => <div data-testid="manage-dialog" />,
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @comp/ui components
vi.mock('@comp/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({ children, disabled, onClick, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@comp/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
  CheckCircle2: () => <span data-testid="check-circle-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Plug: () => <span data-testid="plug-icon" />,
  Settings2: () => <span data-testid="settings-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PlatformIntegrations } from './PlatformIntegrations';

const defaultProps = {
  taskTemplates: [
    { id: 'tmpl-1', taskId: 'task-1', name: 'Test Task', description: 'desc' },
  ],
};

describe('PlatformIntegrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('renders Connect button for platform providers when user has integration:create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<PlatformIntegrations {...defaultProps} />);

      expect(screen.getByText('Connect')).toBeInTheDocument();
    });

    it('does not render Connect button when user lacks integration:create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<PlatformIntegrations {...defaultProps} />);

      expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    it('does not render Connect button when user has no permissions at all', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<PlatformIntegrations {...defaultProps} />);

      expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    it('checks the correct resource and action for create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<PlatformIntegrations {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('integration', 'create');
    });

    it('still renders provider cards and search when user has no create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<PlatformIntegrations {...defaultProps} />);

      // The card itself and provider name should still be visible
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });
});

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

// Mock useParams
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

// --- Integration hooks ---
const mockExistingConnections = [
  {
    id: 'conn-1',
    providerSlug: 'aws',
    providerName: 'AWS',
    status: 'active',
    lastSyncAt: null,
    metadata: {
      connectionName: 'AWS Production',
      accountId: '123456789012',
      regions: ['us-east-1'],
    },
  },
];

const mockProviders = [
  {
    id: 'aws',
    authType: 'custom',
    credentialFields: [
      {
        id: 'connectionName',
        label: 'Connection Name',
        type: 'text',
        required: true,
        placeholder: 'Name',
      },
      {
        id: 'access_key_id',
        label: 'Access Key ID',
        type: 'text',
        required: true,
        placeholder: 'AKIA...',
      },
    ],
    supportsMultipleConnections: true,
  },
];

vi.mock('@/hooks/use-integration-platform', () => ({
  useIntegrationConnections: () => ({
    connections: mockExistingConnections,
    refresh: vi.fn(),
    isLoading: false,
  }),
  useIntegrationMutations: () => ({
    startOAuth: vi.fn(),
    createConnection: vi.fn(),
    deleteConnection: vi.fn(),
    updateConnectionCredentials: vi.fn(),
    updateConnectionMetadata: vi.fn(),
  }),
  useIntegrationProviders: () => ({
    providers: mockProviders,
    isLoading: false,
  }),
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/combobox-dropdown', () => ({
  ComboboxDropdown: () => <div data-testid="combobox" />,
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <h2>{children}</h2>,
}));

vi.mock('@comp/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@comp/ui/label', () => ({
  Label: ({
    children,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label>{children}</label>,
}));

vi.mock('@comp/ui/multiple-selector', () => ({
  default: () => <div data-testid="multi-selector" />,
}));

vi.mock('@comp/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span />,
}));

vi.mock('@comp/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  Eye: () => <span />,
  EyeOff: () => <span />,
  Loader2: () => <span data-testid="loader-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { ConnectIntegrationDialog } from './ConnectIntegrationDialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  integrationId: 'aws',
  integrationName: 'Amazon Web Services',
  integrationLogoUrl: 'https://example.com/aws.png',
  onConnected: vi.fn(),
};

describe('ConnectIntegrationDialog permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows configure (Settings) button for admin with integration:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('hides configure (Settings) button for auditor without integration:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    expect(screen.queryByTestId('settings-icon')).not.toBeInTheDocument();
  });

  it('shows delete (Trash) button for admin with integration:delete', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    // Trash icon rendered inside the destructive disconnect button
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
  });

  it('hides delete (Trash) button for auditor without integration:delete', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();
  });

  it('shows "Add Account" button for admin with integration:create', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    expect(screen.getByText('Add Account')).toBeInTheDocument();
  });

  it('hides "Add Account" button for auditor without integration:create', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    expect(screen.queryByText('Add Account')).not.toBeInTheDocument();
  });

  it('always shows connection info regardless of permissions', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} />);
    expect(
      screen.getByText('Amazon Web Services Connections'),
    ).toBeInTheDocument();
    expect(screen.getByText('AWS Production')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ConnectIntegrationDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
});

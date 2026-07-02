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
  {
    // Basic-auth provider whose catalog maps the two fields to API Key / API Secret
    // (the backend synthesizes these credentialFields from usernameField/passwordField).
    id: 'fivetran',
    authType: 'basic',
    credentialFields: [
      {
        id: 'api_key',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: 'Enter API Key',
      },
      {
        id: 'api_secret',
        label: 'API Secret',
        type: 'password',
        required: true,
        placeholder: 'Enter API Secret',
      },
    ],
    supportsMultipleConnections: false,
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

// Mock @trycompai/ui components
vi.mock('@trycompai/ui/button', () => ({
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

vi.mock('@trycompai/ui/combobox-dropdown', () => ({
  ComboboxDropdown: () => <div data-testid="combobox" />,
}));

vi.mock('@trycompai/ui/dialog', () => ({
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

vi.mock('@trycompai/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@trycompai/ui/label', () => ({
  Label: ({
    children,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label>{children}</label>,
}));

vi.mock('@trycompai/ui/multiple-selector', () => ({
  default: () => <div data-testid="multi-selector" />,
}));

vi.mock('@trycompai/ui/select', () => ({
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

vi.mock('@trycompai/ui/textarea', () => ({
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

describe('ConnectIntegrationDialog basic auth credential labels', () => {
  const fivetranProps = {
    ...defaultProps,
    integrationId: 'fivetran',
    integrationName: 'Fivetran',
    integrationLogoUrl: 'https://example.com/fivetran.png',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setMockPermissions(ADMIN_PERMISSIONS);
  });

  // Regression: Fivetran uses Basic auth but the two fields are API Key / API Secret.
  // The form used to hardcode generic Username/Password ids+labels, so customers saw
  // the wrong labels AND their creds were stored under username/password while the
  // runtime read api_key/api_secret → empty Basic header → 401 on every check.
  it('labels basic-auth fields from the catalog (API Key / API Secret), not generic Username / Password', () => {
    render(<ConnectIntegrationDialog {...fivetranProps} />);

    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText('API Secret')).toBeInTheDocument();
    expect(screen.queryByText('Username')).not.toBeInTheDocument();
    expect(screen.queryByText('Password')).not.toBeInTheDocument();
  });
});

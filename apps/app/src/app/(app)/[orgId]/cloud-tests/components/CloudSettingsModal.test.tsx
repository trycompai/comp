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

// Mock useApi hook
vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    delete: vi.fn(),
  }),
}));

// Mock useIntegrationMutations
vi.mock('@/hooks/use-integration-platform', () => ({
  useIntegrationMutations: () => ({
    deleteConnection: vi.fn(),
  }),
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant: _v,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/cn', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
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
  DialogFooter: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock('@comp/ui/tabs', () => ({
  Tabs: ({
    children,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => <div>{children}</div>,
  TabsContent: ({
    children,
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => <div>{children}</div>,
  TabsList: ({
    children,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  Loader2: ({ className: _c }: { className?: string }) => (
    <span data-testid="loader-icon" />
  ),
  Trash2: ({ className: _c }: { className?: string }) => (
    <span data-testid="trash-icon" />
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { CloudSettingsModal } from './CloudSettingsModal';

const mockProviders = [
  {
    id: 'aws',
    connectionId: 'conn-aws-1',
    name: 'AWS Production',
    status: 'active',
    accountId: '123456789012',
    regions: ['us-east-1'],
    isLegacy: false,
  },
];

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  connectedProviders: mockProviders,
  onUpdate: vi.fn(),
};

describe('CloudSettingsModal permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Disconnect" button for admin with integration:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<CloudSettingsModal {...defaultProps} />);
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('hides "Disconnect" button for auditor without integration:delete permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<CloudSettingsModal {...defaultProps} />);
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
  });

  it('hides "Disconnect" button when user has no permissions', () => {
    setMockPermissions({});
    render(<CloudSettingsModal {...defaultProps} />);
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
  });

  it('always shows connection info regardless of permissions', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<CloudSettingsModal {...defaultProps} />);
    expect(screen.getByText('Manage Cloud Connections')).toBeInTheDocument();
    expect(screen.getByText('AWS Production')).toBeInTheDocument();
    expect(
      screen.getByText(/Credentials are securely stored/),
    ).toBeInTheDocument();
  });

  it('always shows connection status regardless of permissions', () => {
    setMockPermissions({});
    render(<CloudSettingsModal {...defaultProps} />);
    expect(screen.getByText('Connection Status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders nothing when connectedProviders is empty', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const { container } = render(
      <CloudSettingsModal {...defaultProps} connectedProviders={[]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('does not render dialog when open is false', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<CloudSettingsModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
});

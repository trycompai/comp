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
const mockUseSWR = vi.fn(() => ({
  data: { data: { data: [], count: 0 } },
  mutate: vi.fn(),
  isValidating: false,
}));
vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    useSWR: mockUseSWR,
    post: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock child components
vi.mock('./EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock('./ProviderTabs', () => ({
  ProviderTabs: ({
    canRunScan,
    canAddConnection,
  }: {
    canRunScan: boolean;
    canAddConnection: boolean;
  }) => (
    <div data-testid="provider-tabs">
      {canRunScan && <span data-testid="can-run-scan" />}
      {canAddConnection && <span data-testid="can-add-connection" />}
    </div>
  ),
}));

vi.mock('./CloudSettingsModal', () => ({
  CloudSettingsModal: () => <div data-testid="cloud-settings-modal" />,
}));

vi.mock('@/components/integrations/ConnectIntegrationDialog', () => ({
  ConnectIntegrationDialog: () => <div data-testid="connect-integration-dialog" />,
}));

vi.mock('@/components/integrations/ManageIntegrationDialog', () => ({
  ManageIntegrationDialog: () => <div data-testid="manage-integration-dialog" />,
}));

vi.mock('../constants', () => ({
  isCloudProviderSlug: vi.fn(() => false),
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    onClick,
    variant: _v,
    size: _s,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  PageHeader: ({
    title,
    actions,
    children,
  }: {
    title: string;
    actions?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {actions}
      {children}
    </div>
  ),
  PageHeaderDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

import { TestsLayout } from './TestsLayout';

const mockProvider = {
  id: 'conn-1',
  integrationId: 'aws',
  name: 'AWS',
  displayName: 'AWS Production',
  status: 'active',
  lastRunAt: '2024-01-01',
  isLegacy: false,
  supportsMultipleConnections: false,
  requiredVariables: [],
  variables: {},
  accountId: '123456789012',
  regions: ['us-east-1'],
};

const defaultProps = {
  initialFindings: [],
  initialProviders: [mockProvider],
  orgId: 'org_123',
};

describe('TestsLayout permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return the mock provider in useSWR so the component sees connectedProviders.length > 0
    // and renders the main layout (not EmptyState).
    // useSWR is called twice: first for findings, then for providers.
    let callCount = 0;
    mockUseSWR.mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 1) {
        // findings call
        return {
          data: { data: { data: [], count: 0 } },
          mutate: vi.fn(),
          isValidating: false,
        };
      }
      // providers call
      return {
        data: { data: { data: [mockProvider], count: 1 } },
        mutate: vi.fn(),
        isValidating: false,
      };
    });
  });

  it('shows "Add Cloud" button for admin with integration:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TestsLayout {...defaultProps} />);
    expect(screen.getByText('Add Cloud')).toBeInTheDocument();
  });

  it('hides "Add Cloud" button for read-only (auditor) user', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TestsLayout {...defaultProps} />);
    expect(screen.queryByText('Add Cloud')).not.toBeInTheDocument();
  });

  it('shows settings button for admin with integration:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TestsLayout {...defaultProps} />);
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
  });

  it('hides settings button for read-only (auditor) user', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TestsLayout {...defaultProps} />);
    expect(screen.queryByTestId('settings-icon')).not.toBeInTheDocument();
  });

  it('passes canRunScan and canAddConnection correctly for admin', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TestsLayout {...defaultProps} />);
    expect(screen.getByTestId('can-run-scan')).toBeInTheDocument();
    expect(screen.getByTestId('can-add-connection')).toBeInTheDocument();
  });

  it('passes canRunScan=false and canAddConnection=false for auditor', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TestsLayout {...defaultProps} />);
    expect(screen.queryByTestId('can-run-scan')).not.toBeInTheDocument();
    expect(screen.queryByTestId('can-add-connection')).not.toBeInTheDocument();
  });

  it('always renders page title regardless of permissions', () => {
    setMockPermissions({});
    render(<TestsLayout {...defaultProps} />);
    expect(screen.getByText('Cloud Security Tests')).toBeInTheDocument();
  });

  it('shows EmptyState when no providers are connected', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    // Override mock so both findings and providers return empty
    mockUseSWR.mockReturnValue({
      data: { data: { data: [], count: 0 } },
      mutate: vi.fn(),
      isValidating: false,
    });
    render(
      <TestsLayout
        initialFindings={[]}
        initialProviders={[]}
        orgId="org_123"
      />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});

import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="icon-add" />,
  Renew: () => <span data-testid="icon-renew" />,
}));

vi.mock('./AutomationItem', () => ({
  AutomationItem: ({
    automation,
    readOnly,
  }: {
    automation: { id: string; name: string };
    readOnly?: boolean;
  }) => (
    <div data-testid={`automation-item-${automation.id}`} data-readonly={String(readOnly)}>
      {automation.name}
    </div>
  ),
}));

vi.mock('./ConnectionManageMenu', () => ({
  ConnectionManageMenu: () => <div data-testid="connection-manage-menu" />,
}));

import type { BrowserAuthProfile, BrowserAutomation } from '../../hooks/types';
import { BrowserAutomationsList } from './BrowserAutomationsList';

const mockAutomations: BrowserAutomation[] = [
  {
    id: 'auto_1',
    name: 'Test Automation',
    targetUrl: 'https://example.com',
    instruction: 'Take screenshot',
    isEnabled: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

function profile(status: BrowserAuthProfile['status']): BrowserAuthProfile {
  return {
    id: 'bap_1',
    hostname: 'example.com',
    loginIdentity: '',
    displayName: 'example.com',
    contextId: 'ctx_1',
    status,
  };
}

const defaultProps = {
  automations: mockAutomations,
  profiles: [] as BrowserAuthProfile[],
  runningAutomationId: null,
  onRun: vi.fn(),
  onReconnect: vi.fn(),
  onCreateClick: vi.fn(),
  onEditClick: vi.fn(),
  onDelete: vi.fn(),
  onToggleEnabled: vi.fn(),
};

describe('BrowserAutomationsList', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('renders the heading', () => {
    render(<BrowserAutomationsList {...defaultProps} />);
    expect(screen.getByText('Browser evidence')).toBeInTheDocument();
  });

  it('shows create actions for admin with integration:create', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserAutomationsList {...defaultProps} />);
    expect(screen.getByText('Add instruction')).toBeInTheDocument();
  });

  it('hides create actions for auditor without integration:create', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<BrowserAutomationsList {...defaultProps} />);
    expect(screen.queryByText('Add instruction')).not.toBeInTheDocument();
  });

  it('hides create actions when onCreateClick is not provided (manual task)', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserAutomationsList {...defaultProps} onCreateClick={undefined} />);
    expect(screen.queryByText('Add instruction')).not.toBeInTheDocument();
  });

  it('passes readOnly=false to AutomationItem for admin with integration:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserAutomationsList {...defaultProps} />);
    expect(screen.getByTestId('automation-item-auto_1')).toHaveAttribute('data-readonly', 'false');
  });

  it('passes readOnly=true to AutomationItem for auditor without integration:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<BrowserAutomationsList {...defaultProps} />);
    expect(screen.getByTestId('automation-item-auto_1')).toHaveAttribute('data-readonly', 'true');
  });

  it('shows a Connected pill for a matching verified profile', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserAutomationsList {...defaultProps} profiles={[profile('verified')]} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('offers Reconnect for a needs_reauth connection and calls onReconnect', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const onReconnect = vi.fn();
    render(
      <BrowserAutomationsList
        {...defaultProps}
        profiles={[profile('needs_reauth')]}
        onReconnect={onReconnect}
      />,
    );
    fireEvent.click(screen.getByText('Reconnect'));
    expect(onReconnect).toHaveBeenCalledWith('https://example.com');
  });
});

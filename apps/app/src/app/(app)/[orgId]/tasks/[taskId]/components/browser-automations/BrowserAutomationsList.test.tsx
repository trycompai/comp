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

// Mock @comp/ui/badge
vi.mock('@comp/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => 'in 5 hours',
}));

// Mock AutomationItem
vi.mock('./AutomationItem', () => ({
  AutomationItem: ({ automation, readOnly }: any) => (
    <div data-testid={`automation-item-${automation.id}`} data-readonly={String(readOnly)}>
      {automation.name}
    </div>
  ),
}));

import { BrowserAutomationsList } from './BrowserAutomationsList';
import type { BrowserAutomation } from '../../hooks/types';

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

const defaultProps = {
  automations: mockAutomations,
  hasContext: true,
  runningAutomationId: null,
  onRun: vi.fn(),
  onCreateClick: vi.fn(),
  onEditClick: vi.fn(),
};

describe('BrowserAutomationsList permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('renders the automations list heading regardless of permissions', () => {
    setMockPermissions({});

    render(<BrowserAutomationsList {...defaultProps} />);

    expect(screen.getByText('Browser Automations')).toBeInTheDocument();
  });

  it('shows "Create Another" button for admin with integration:create', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<BrowserAutomationsList {...defaultProps} />);

    expect(screen.getByText('Create Another')).toBeInTheDocument();
  });

  it('hides "Create Another" button for auditor without integration:create', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<BrowserAutomationsList {...defaultProps} />);

    expect(screen.queryByText('Create Another')).not.toBeInTheDocument();
  });

  it('hides "Create Another" button when user has no permissions', () => {
    setMockPermissions({});

    render(<BrowserAutomationsList {...defaultProps} />);

    expect(screen.queryByText('Create Another')).not.toBeInTheDocument();
  });

  it('hides "Create Another" when onCreateClick is not provided (manual task)', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<BrowserAutomationsList {...defaultProps} onCreateClick={undefined} />);

    expect(screen.queryByText('Create Another')).not.toBeInTheDocument();
  });

  it('passes readOnly=false to AutomationItem for admin with integration:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<BrowserAutomationsList {...defaultProps} />);

    const item = screen.getByTestId('automation-item-auto_1');
    expect(item).toHaveAttribute('data-readonly', 'false');
  });

  it('passes readOnly=true to AutomationItem for auditor without integration:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<BrowserAutomationsList {...defaultProps} />);

    const item = screen.getByTestId('automation-item-auto_1');
    expect(item).toHaveAttribute('data-readonly', 'true');
  });

  it('passes readOnly=true to AutomationItem when user has no permissions', () => {
    setMockPermissions({});

    render(<BrowserAutomationsList {...defaultProps} />);

    const item = screen.getByTestId('automation-item-auto_1');
    expect(item).toHaveAttribute('data-readonly', 'true');
  });

  it('shows "Connected" badge when hasContext is true regardless of permissions', () => {
    setMockPermissions({});

    render(<BrowserAutomationsList {...defaultProps} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});

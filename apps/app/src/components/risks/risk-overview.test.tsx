import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock child components
vi.mock('../forms/risks/risk-overview', () => ({
  UpdateRiskOverview: () => <div data-testid="update-risk-overview" />,
}));

vi.mock('../sheets/risk-overview-sheet', () => ({
  RiskOverviewSheet: () => <div data-testid="risk-overview-sheet" />,
}));

// Mock design-system
vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    size?: string;
    variant?: string;
  }) => (
    <button onClick={onClick} data-testid="edit-button">
      {children}
    </button>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Edit: () => <span data-testid="edit-icon" />,
}));

import { RiskOverview } from './risk-overview';

const mockRisk: any = {
  id: 'risk_1',
  title: 'Test Risk Title',
  description: 'Test risk description',
  assignee: null,
};

const mockAssignees: any[] = [];

describe('RiskOverview permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the edit button when user has risk:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.getByTestId('edit-button')).toBeInTheDocument();
  });

  it('hides the edit button when user lacks risk:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<RiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
  });

  it('hides the edit button when user has no permissions', () => {
    setMockPermissions({});

    render(<RiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
  });

  it('renders risk title and description regardless of permissions', () => {
    setMockPermissions({});

    render(<RiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.getByText('Test Risk Title')).toBeInTheDocument();
    expect(screen.getByText('Test risk description')).toBeInTheDocument();
  });

  it('always renders the UpdateRiskOverview child component', () => {
    setMockPermissions({});

    render(<RiskOverview risk={mockRisk} assignees={mockAssignees} />);

    expect(screen.getByTestId('update-risk-overview')).toBeInTheDocument();
  });
});

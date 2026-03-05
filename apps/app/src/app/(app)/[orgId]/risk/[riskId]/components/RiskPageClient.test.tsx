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

// Mock useRisk hook
const mockRisk = {
  id: 'risk_1',
  title: 'Test Risk',
  description: 'A test risk description',
  category: 'other',
  department: null,
  status: 'open',
  likelihood: 'possible',
  impact: 'moderate',
  residualLikelihood: 'unlikely',
  residualImpact: 'minor',
  treatmentStrategy: 'mitigate',
  treatmentStrategyDescription: null,
  organizationId: 'org_123',
  assigneeId: null,
  assignee: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

vi.mock('@/hooks/use-risks', () => ({
  useRisk: () => ({
    risk: mockRisk,
  }),
}));

// Mock @db
vi.mock('@db', () => ({
  CommentEntityType: { risk: 'risk' },
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  PageHeader: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <div data-testid="page-header-actions">{actions}</div>
    </div>
  ),
}));

// Mock child components
vi.mock('@/components/comments/Comments', () => ({
  Comments: () => <div data-testid="comments" />,
}));

vi.mock('@/components/risks/charts/InherentRiskChart', () => ({
  InherentRiskChart: () => <div data-testid="inherent-risk-chart" />,
}));

vi.mock('@/components/risks/charts/ResidualRiskChart', () => ({
  ResidualRiskChart: () => <div data-testid="residual-risk-chart" />,
}));

vi.mock('@/components/risks/risk-overview', () => ({
  RiskOverview: () => <div data-testid="risk-overview" />,
}));

vi.mock('@/components/task-items/TaskItems', () => ({
  TaskItems: () => <div data-testid="task-items" />,
}));

// Mock RiskActions to show/hide based on permissions
vi.mock('./RiskActions', () => ({
  RiskActions: ({ riskId, orgId }: any) => (
    <div data-testid="risk-actions" data-risk-id={riskId} data-org-id={orgId} />
  ),
}));

import { RiskPageClient } from './RiskPageClient';

const initialRisk = {
  ...mockRisk,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
} as any;

const defaultProps = {
  riskId: 'risk_1',
  orgId: 'org_123',
  initialRisk,
  assignees: [],
  taskItemId: null,
};

describe('RiskPageClient permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('renders the page header with risk title', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RiskPageClient {...defaultProps} />);

    expect(screen.getByText('Test Risk')).toBeInTheDocument();
  });

  it('renders RiskActions in the page header for admin', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RiskPageClient {...defaultProps} />);

    expect(screen.getByTestId('risk-actions')).toBeInTheDocument();
  });

  it('renders RiskActions for auditor (the component itself handles gating)', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<RiskPageClient {...defaultProps} />);

    // RiskActions is always rendered; it gates itself internally
    expect(screen.getByTestId('risk-actions')).toBeInTheDocument();
  });

  it('renders RiskOverview, charts, and comments when not viewing a task', () => {
    setMockPermissions({});

    render(<RiskPageClient {...defaultProps} />);

    expect(screen.getByTestId('risk-overview')).toBeInTheDocument();
    expect(screen.getByTestId('inherent-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('residual-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('comments')).toBeInTheDocument();
  });

  it('hides RiskOverview, charts, and comments when viewing a task item', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RiskPageClient {...defaultProps} taskItemId="task_item_1" />);

    expect(screen.queryByTestId('risk-overview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inherent-risk-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('residual-risk-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comments')).not.toBeInTheDocument();
  });

  it('always renders TaskItems regardless of permissions', () => {
    setMockPermissions({});

    render(<RiskPageClient {...defaultProps} />);

    expect(screen.getByTestId('task-items')).toBeInTheDocument();
  });

  it('shows short task ID as title when viewing a task item', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RiskPageClient {...defaultProps} taskItemId="abc123def456" />);

    // shortTaskId takes last 6 chars, uppercased
    expect(screen.getByText('DEF456')).toBeInTheDocument();
  });

  it('renders page header regardless of user permissions', () => {
    setMockPermissions({});

    render(<RiskPageClient {...defaultProps} />);

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });
});

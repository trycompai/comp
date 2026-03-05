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

// Mock useVendor
vi.mock('@/hooks/use-vendors', () => ({
  useVendor: () => ({
    vendor: null,
    mutate: vi.fn(),
  }),
}));

// Mock child components
vi.mock('./VendorHeader', () => ({
  VendorHeader: ({ vendor }: any) => (
    <div data-testid="vendor-header">{vendor.name}</div>
  ),
}));

vi.mock('./secondary-fields/secondary-fields', () => ({
  SecondaryFields: () => <div data-testid="secondary-fields" />,
}));

let inherentChartProps: any = null;
let residualChartProps: any = null;

vi.mock('./VendorInherentRiskChart', () => ({
  VendorInherentRiskChart: (props: any) => {
    inherentChartProps = props;
    return <div data-testid="inherent-risk-chart" />;
  },
}));

vi.mock('./VendorResidualRiskChart', () => ({
  VendorResidualRiskChart: (props: any) => {
    residualChartProps = props;
    return <div data-testid="residual-risk-chart" />;
  },
}));

vi.mock('@/components/task-items/TaskItems', () => ({
  TaskItems: () => <div data-testid="task-items" />,
}));

vi.mock('@/components/comments/Comments', () => ({
  Comments: () => <div data-testid="comments" />,
}));

import { VendorPageClient } from './VendorPageClient';

const mockVendor: any = {
  id: 'vendor-1',
  name: 'Test Vendor',
  description: 'A test vendor',
  category: 'cloud',
  status: 'assessed',
  inherentProbability: 'possible',
  inherentImpact: 'moderate',
  residualProbability: 'unlikely',
  residualImpact: 'minor',
  website: null,
  isSubProcessor: false,
  logoUrl: null,
  showOnTrustPortal: false,
  trustPortalOrder: null,
  complianceBadges: null,
  organizationId: 'org-1',
  assigneeId: null,
  assignee: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  riskAssessmentData: null,
  riskAssessmentVersion: null,
  riskAssessmentUpdatedAt: null,
};

const mockAssignees: any[] = [];

describe('VendorPageClient', () => {
  beforeEach(() => {
    setMockPermissions({});
    inherentChartProps = null;
    residualChartProps = null;
  });

  it('renders vendor header, risk charts, task items, and comments with no permissions', () => {
    setMockPermissions({});

    render(
      <VendorPageClient
        vendorId="vendor-1"
        orgId="org-1"
        initialVendor={mockVendor}
        assignees={mockAssignees}
        isViewingTask={false}
      />,
    );

    // Component renders all sections regardless of permissions
    // Permission gating happens inside child components (VendorInherentRiskChart, VendorResidualRiskChart)
    expect(screen.getByTestId('vendor-header')).toBeInTheDocument();
    expect(screen.getByTestId('secondary-fields')).toBeInTheDocument();
    expect(screen.getByTestId('inherent-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('residual-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('task-items')).toBeInTheDocument();
    expect(screen.getByTestId('comments')).toBeInTheDocument();
  });

  it('renders all sections with admin permissions', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <VendorPageClient
        vendorId="vendor-1"
        orgId="org-1"
        initialVendor={mockVendor}
        assignees={mockAssignees}
        isViewingTask={false}
      />,
    );

    expect(screen.getByTestId('vendor-header')).toBeInTheDocument();
    expect(screen.getByTestId('secondary-fields')).toBeInTheDocument();
    expect(screen.getByTestId('inherent-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('residual-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('task-items')).toBeInTheDocument();
    expect(screen.getByTestId('comments')).toBeInTheDocument();
  });

  it('hides header, secondary fields, risk charts, and comments when isViewingTask is true', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <VendorPageClient
        vendorId="vendor-1"
        orgId="org-1"
        initialVendor={mockVendor}
        assignees={mockAssignees}
        isViewingTask={true}
      />,
    );

    expect(screen.queryByTestId('vendor-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('secondary-fields')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inherent-risk-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('residual-risk-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('comments')).not.toBeInTheDocument();
    // TaskItems should still be visible
    expect(screen.getByTestId('task-items')).toBeInTheDocument();
  });

  it('renders for auditor role with limited permissions', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(
      <VendorPageClient
        vendorId="vendor-1"
        orgId="org-1"
        initialVendor={mockVendor}
        assignees={mockAssignees}
        isViewingTask={false}
      />,
    );

    // VendorPageClient itself renders all sections; gating is in child components
    expect(screen.getByTestId('vendor-header')).toBeInTheDocument();
    expect(screen.getByTestId('inherent-risk-chart')).toBeInTheDocument();
    expect(screen.getByTestId('residual-risk-chart')).toBeInTheDocument();
  });
});

import { render } from '@testing-library/react';
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

// Mock useVendor and useVendorActions
vi.mock('@/hooks/use-vendors', () => ({
  useVendor: () => ({
    vendor: null,
    mutate: vi.fn(),
  }),
  useVendorActions: () => ({
    updateVendor: vi.fn(),
  }),
}));

// Capture props passed to RiskMatrixChart
let capturedProps: any = null;
vi.mock('@/components/risks/charts/RiskMatrixChart', () => ({
  RiskMatrixChart: (props: any) => {
    capturedProps = props;
    return <div data-testid="risk-matrix-chart" />;
  },
}));

import { VendorResidualRiskChart } from './VendorResidualRiskChart';

const mockVendor: any = {
  id: 'vendor-1',
  residualProbability: 'unlikely',
  residualImpact: 'minor',
};

describe('VendorResidualRiskChart', () => {
  beforeEach(() => {
    setMockPermissions({});
    capturedProps = null;
  });

  it('passes readOnly=true when user lacks vendor:update permission', () => {
    setMockPermissions({});

    render(<VendorResidualRiskChart vendor={mockVendor} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(true);
  });

  it('passes readOnly=true for auditor without vendor:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<VendorResidualRiskChart vendor={mockVendor} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(true);
  });

  it('passes readOnly=false when user has vendor:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<VendorResidualRiskChart vendor={mockVendor} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(false);
  });

  it('passes correct vendor properties to RiskMatrixChart', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<VendorResidualRiskChart vendor={mockVendor} />);

    expect(capturedProps.title).toBe('Residual Risk');
    expect(capturedProps.description).toBe(
      'Select the residual risk level for this vendor',
    );
    expect(capturedProps.riskId).toBe('vendor-1');
    expect(capturedProps.activeLikelihood).toBe('unlikely');
    expect(capturedProps.activeImpact).toBe('minor');
  });

  it('passes readOnly=true when user has only vendor:read permission', () => {
    setMockPermissions({ vendor: ['read'] });

    render(<VendorResidualRiskChart vendor={mockVendor} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(true);
  });
});

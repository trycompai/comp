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

// Mock useVendor and useVendorActions
const mockTriggerAssessment = vi.fn();
vi.mock('@/hooks/use-vendors', () => ({
  useVendor: () => ({
    vendor: null,
    mutate: vi.fn(),
  }),
  useVendorActions: () => ({
    updateVendor: vi.fn(),
    triggerAssessment: mockTriggerAssessment,
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
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
  status: 'assessed',
  inherentProbability: 'possible',
  inherentImpact: 'moderate',
  residualProbability: 'unlikely',
  residualImpact: 'minor',
  treatmentStrategy: 'accept',
  tasks: [],
};

describe('VendorResidualRiskChart', () => {
  beforeEach(() => {
    setMockPermissions({});
    capturedProps = null;
    mockTriggerAssessment.mockReset();
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
      'Risk level after the treatment plan is applied. The dashed cell is the suggestion computed from your strategy and linked task completion.',
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

  describe('status branches', () => {
    it('renders NotAssessedState when status is not_assessed', () => {
      setMockPermissions(ADMIN_PERMISSIONS);
      const vendor = { ...mockVendor, status: 'not_assessed' };

      render(<VendorResidualRiskChart vendor={vendor} />);

      expect(screen.queryByTestId('risk-matrix-chart')).toBeNull();
      expect(screen.getByRole('button', { name: /Run risk assessment/i })).toBeInTheDocument();
      expect(capturedProps).toBeNull();
    });

    it('passes preliminary=true to RiskMatrixChart when status is in_progress', () => {
      setMockPermissions(ADMIN_PERMISSIONS);
      const vendor = { ...mockVendor, status: 'in_progress' };

      render(<VendorResidualRiskChart vendor={vendor} />);

      expect(capturedProps).not.toBeNull();
      expect(capturedProps.preliminary).toBe(true);
    });

    it('passes preliminary=false to RiskMatrixChart when status is assessed', () => {
      setMockPermissions(ADMIN_PERMISSIONS);
      const vendor = { ...mockVendor, status: 'assessed' };

      render(<VendorResidualRiskChart vendor={vendor} />);

      expect(capturedProps).not.toBeNull();
      expect(capturedProps.preliminary).toBe(false);
    });
  });
});

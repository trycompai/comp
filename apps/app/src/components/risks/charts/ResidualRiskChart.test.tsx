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

// Mock useRiskActions
vi.mock('@/hooks/use-risks', () => ({
  useRiskActions: () => ({
    updateRisk: vi.fn(),
  }),
}));

// Mock useSWRConfig
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

// Capture props passed to RiskMatrixChart
let capturedProps: any = null;
vi.mock('./RiskMatrixChart', () => ({
  RiskMatrixChart: (props: any) => {
    capturedProps = props;
    return <div data-testid="risk-matrix-chart" />;
  },
}));

import { ResidualRiskChart } from './ResidualRiskChart';

const mockRisk: any = {
  id: 'risk-1',
  residualLikelihood: 'unlikely',
  residualImpact: 'minor',
};

describe('ResidualRiskChart permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    capturedProps = null;
  });

  it('passes readOnly=true to RiskMatrixChart when user lacks risk:update permission', () => {
    setMockPermissions({});

    render(<ResidualRiskChart risk={mockRisk} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(true);
  });

  it('passes readOnly=true for auditor without risk:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<ResidualRiskChart risk={mockRisk} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(true);
  });

  it('passes readOnly=false to RiskMatrixChart when user has risk:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<ResidualRiskChart risk={mockRisk} />);

    expect(capturedProps).not.toBeNull();
    expect(capturedProps.readOnly).toBe(false);
  });

  it('passes correct risk properties to RiskMatrixChart', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<ResidualRiskChart risk={mockRisk} />);

    expect(capturedProps.title).toBe('Residual Risk');
    expect(capturedProps.description).toBe(
      'Remaining risk level after controls are applied',
    );
    expect(capturedProps.riskId).toBe('risk-1');
    expect(capturedProps.activeLikelihood).toBe('unlikely');
    expect(capturedProps.activeImpact).toBe('minor');
  });
});

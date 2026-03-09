import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

const mockUpdateOrganization = vi.fn();

vi.mock('@/hooks/use-organization-mutations', () => ({
  useOrganizationMutations: () => ({
    updateOrganization: mockUpdateOrganization,
    uploadLogo: vi.fn(),
    removeLogo: vi.fn(),
    deleteOrganization: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@trycompai/design-system', () => ({
  SettingGroup: ({ children }: any) => <div data-testid="setting-group">{children}</div>,
  SettingRow: ({ children, label, description }: any) => (
    <div data-testid="setting-row">
      <span>{label}</span>
      <span>{description}</span>
      {children}
    </div>
  ),
  Switch: ({ checked, disabled, onCheckedChange }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-testid="portal-switch"
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}));

import { PortalSettings } from './portal-settings';

const defaultProps = {
  deviceAgentStepEnabled: true,
  securityTrainingStepEnabled: false,
  whistleblowerReportEnabled: true,
  accessRequestFormEnabled: false,
};

describe('PortalSettings permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables all switches when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<PortalSettings {...defaultProps} />);

    const switches = screen.getAllByTestId('portal-switch');
    expect(switches).toHaveLength(4);
    for (const sw of switches) {
      expect(sw).not.toBeDisabled();
    }
  });

  it('disables all switches when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<PortalSettings {...defaultProps} />);

    const switches = screen.getAllByTestId('portal-switch');
    for (const sw of switches) {
      expect(sw).toBeDisabled();
    }
  });

  it('disables all switches when user has no permissions', () => {
    setMockPermissions({});
    render(<PortalSettings {...defaultProps} />);

    const switches = screen.getAllByTestId('portal-switch');
    for (const sw of switches) {
      expect(sw).toBeDisabled();
    }
  });

  it('displays all setting labels regardless of permissions', () => {
    setMockPermissions({});
    render(<PortalSettings {...defaultProps} />);

    expect(screen.getByText('Show Device Agent Step')).toBeInTheDocument();
    expect(screen.getByText('Show Security Training Step')).toBeInTheDocument();
    expect(screen.getByText('Show Whistleblower Report Form')).toBeInTheDocument();
    expect(screen.getByText('Show Access Request Form')).toBeInTheDocument();
  });

  it('reflects current toggle state in switches', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<PortalSettings {...defaultProps} />);

    const switches = screen.getAllByRole('switch');
    // deviceAgentStepEnabled: true
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    // securityTrainingStepEnabled: false
    expect(switches[1]).toHaveAttribute('aria-checked', 'false');
    // whistleblowerReportEnabled: true
    expect(switches[2]).toHaveAttribute('aria-checked', 'true');
    // accessRequestFormEnabled: false
    expect(switches[3]).toHaveAttribute('aria-checked', 'false');
  });
});

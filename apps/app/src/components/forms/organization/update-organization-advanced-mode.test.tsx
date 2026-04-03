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

// Mock useApi
vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    patch: vi.fn(),
  }),
}));

// Mock useSWRConfig
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock design-system Switch
vi.mock('@trycompai/design-system', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-testid="advanced-mode-switch"
    />
  ),
}));

import { UpdateOrganizationAdvancedMode } from './update-organization-advanced-mode';

describe('UpdateOrganizationAdvancedMode permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the switch when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<UpdateOrganizationAdvancedMode advancedModeEnabled={false} />);

    const switchEl = screen.getByTestId('advanced-mode-switch');
    expect(switchEl).toBeDisabled();
  });

  it('disables the switch when user has no permissions', () => {
    setMockPermissions({});

    render(<UpdateOrganizationAdvancedMode advancedModeEnabled={false} />);

    const switchEl = screen.getByTestId('advanced-mode-switch');
    expect(switchEl).toBeDisabled();
  });

  it('enables the switch when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<UpdateOrganizationAdvancedMode advancedModeEnabled={false} />);

    const switchEl = screen.getByTestId('advanced-mode-switch');
    expect(switchEl).not.toBeDisabled();
  });

  it('renders the Advanced Mode title regardless of permissions', () => {
    setMockPermissions({});

    render(<UpdateOrganizationAdvancedMode advancedModeEnabled={true} />);

    const elements = screen.getAllByText('Advanced Mode');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });
});

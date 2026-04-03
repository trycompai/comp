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

// Mock useOrganizationMutations
vi.mock('@/hooks/use-organization-mutations', () => ({
  useOrganizationMutations: () => ({
    updateOrganization: vi.fn(),
  }),
}));

// Mock actions/schema
vi.mock('@/actions/schema', async () => {
  const { z } = await import('zod');
  return {
    organizationEvidenceApprovalSchema: z.object({
      evidenceApprovalEnabled: z.boolean(),
    }),
  };
});

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
      data-testid="evidence-approval-switch"
    />
  ),
}));

import { UpdateOrganizationEvidenceApproval } from './update-organization-evidence-approval';

describe('UpdateOrganizationEvidenceApproval permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables the switch when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(
      <UpdateOrganizationEvidenceApproval evidenceApprovalEnabled={false} />,
    );

    const switchEl = screen.getByTestId('evidence-approval-switch');
    expect(switchEl).toBeDisabled();
  });

  it('disables the switch when user has no permissions', () => {
    setMockPermissions({});

    render(
      <UpdateOrganizationEvidenceApproval evidenceApprovalEnabled={false} />,
    );

    const switchEl = screen.getByTestId('evidence-approval-switch');
    expect(switchEl).toBeDisabled();
  });

  it('enables the switch when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(
      <UpdateOrganizationEvidenceApproval evidenceApprovalEnabled={false} />,
    );

    const switchEl = screen.getByTestId('evidence-approval-switch');
    expect(switchEl).not.toBeDisabled();
  });

  it('renders the Evidence Approval label regardless of permissions', () => {
    setMockPermissions({});

    render(
      <UpdateOrganizationEvidenceApproval evidenceApprovalEnabled={true} />,
    );

    expect(screen.getByText('Evidence Approval')).toBeInTheDocument();
  });
});

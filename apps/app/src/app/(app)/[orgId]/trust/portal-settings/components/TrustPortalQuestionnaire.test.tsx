import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUpdate } = vi.hoisted(() => ({ mockUpdate: vi.fn() }));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    updateSecurityQuestionnaireEnabled: mockUpdate,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@trycompai/design-system/icons', () => ({
  View: () => <span data-testid="view-icon" />,
  ViewOff: () => <span data-testid="view-off-icon" />,
}));

import { TrustPortalQuestionnaire } from './TrustPortalQuestionnaire';

describe('TrustPortalQuestionnaire', () => {
  const defaultProps = { initialEnabled: true, orgId: 'org-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue(undefined);
  });

  it('renders explanatory copy regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalQuestionnaire {...defaultProps} />);
    expect(screen.getByText(/receive AI-assisted answers/i)).toBeInTheDocument();
  });

  it('enables the toggle buttons when the user has trust:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalQuestionnaire {...defaultProps} />);
    expect(screen.getByText('Visible').closest('button')).not.toBeDisabled();
    expect(screen.getByText('Hidden').closest('button')).not.toBeDisabled();
  });

  it('disables the toggle buttons when the user lacks trust:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalQuestionnaire {...defaultProps} />);
    expect(screen.getByText('Visible').closest('button')).toBeDisabled();
    expect(screen.getByText('Hidden').closest('button')).toBeDisabled();
  });

  it('saves disabled=false when an admin clicks Hidden', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalQuestionnaire {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Hidden'));
    });
    expect(mockUpdate).toHaveBeenCalledWith(false);
  });

  it('does not call the API when a read-only user clicks Hidden', async () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalQuestionnaire {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Hidden'));
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves enabled=true when an admin re-enables a hidden questionnaire', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalQuestionnaire initialEnabled={false} orgId="org-1" />);
    await act(async () => {
      fireEvent.click(screen.getByText('Visible'));
    });
    expect(mockUpdate).toHaveBeenCalledWith(true);
  });

  it('exposes the active state to assistive tech via aria-pressed', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalQuestionnaire initialEnabled={true} orgId="org-1" />);
    expect(screen.getByText('Visible').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Hidden').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('resyncs local state when initialEnabled changes', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const { rerender } = render(<TrustPortalQuestionnaire initialEnabled={true} orgId="org-1" />);
    expect(screen.getByText('Visible').closest('button')).toHaveAttribute('aria-pressed', 'true');

    rerender(<TrustPortalQuestionnaire initialEnabled={false} orgId="org-1" />);
    expect(screen.getByText('Hidden').closest('button')).toHaveAttribute('aria-pressed', 'true');
  });
});

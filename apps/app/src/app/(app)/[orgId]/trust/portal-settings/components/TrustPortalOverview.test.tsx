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

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    saveOverview: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick, disabled, loading, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
  Input: (props: any) => <input {...props} />,
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  View: () => <span data-testid="view-icon" />,
  ViewOff: () => <span data-testid="view-off-icon" />,
}));

import { TrustPortalOverview } from './TrustPortalOverview';

describe('TrustPortalOverview permission gating', () => {
  const defaultProps = {
    initialData: {
      overviewTitle: 'Our Mission',
      overviewContent: 'We are committed to security.',
      showOverview: true,
    },
    orgId: 'org-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders description regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalOverview {...defaultProps} />);
    expect(
      screen.getByText(/add a mission statement or overview text/i),
    ).toBeInTheDocument();
  });

  it('shows Save Changes button when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('hides Save Changes button when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('hides Save Changes button when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustPortalOverview {...defaultProps} />);
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('enables title input when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    const titleInput = screen.getByDisplayValue('Our Mission');
    expect(titleInput).not.toBeDisabled();
  });

  it('disables title input when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    const titleInput = screen.getByDisplayValue('Our Mission');
    expect(titleInput).toBeDisabled();
  });

  it('enables content textarea when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    const contentTextarea = screen.getByDisplayValue('We are committed to security.');
    expect(contentTextarea).not.toBeDisabled();
  });

  it('disables content textarea when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    const contentTextarea = screen.getByDisplayValue('We are committed to security.');
    expect(contentTextarea).toBeDisabled();
  });

  it('disables visibility toggle buttons when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    const visibleButton = screen.getByText('Visible').closest('button');
    const hiddenButton = screen.getByText('Hidden').closest('button');
    expect(visibleButton).toBeDisabled();
    expect(hiddenButton).toBeDisabled();
  });

  it('enables visibility toggle buttons when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalOverview {...defaultProps} />);
    const visibleButton = screen.getByText('Visible').closest('button');
    const hiddenButton = screen.getByText('Hidden').closest('button');
    expect(visibleButton).not.toBeDisabled();
    expect(hiddenButton).not.toBeDisabled();
  });
});

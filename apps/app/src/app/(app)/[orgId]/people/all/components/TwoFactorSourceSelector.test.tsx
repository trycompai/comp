import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TwoFactorSourceSelector } from './TwoFactorSourceSelector';
import type { TwoFactorSourceProviderInfo } from '../hooks/use2faSource';

const { mockHasPermission, mockUse2faSource } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
  mockUse2faSource: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock('../hooks/use2faSource', () => ({
  use2faSource: (opts: { organizationId: string; enabled?: boolean }) =>
    mockUse2faSource(opts),
}));

const source: TwoFactorSourceProviderInfo = {
  slug: 'google-workspace',
  name: 'Google Workspace',
  logoUrl: 'https://example.com/gws.png',
  connected: true,
  connectionId: 'icn_1',
  lastSyncAt: null,
  nextSyncAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUse2faSource.mockReturnValue({
    selectedSource: 'google-workspace',
    isLoading: false,
    availableSources: [source],
    setSource: vi.fn(),
    hasAnyConnection: true,
  });
});

describe('TwoFactorSourceSelector — RBAC gating', () => {
  it('renders the selector for a user with integration:update', () => {
    mockHasPermission.mockImplementation(
      (resource: string, action: string) =>
        resource === 'integration' && action === 'update',
    );

    render(<TwoFactorSourceSelector />);

    // portal={false} keeps the inline option list mounted, so the name can
    // appear in both the trigger and the (hidden) list.
    expect(screen.getAllByText('Google Workspace').length).toBeGreaterThan(0);
    // The inline "2FA status from ·" prefix tells users what the control is for and
    // makes it part of the trigger's accessible name for screen readers.
    expect(
      screen.getByRole('combobox', { name: /2FA status/ }),
    ).toBeInTheDocument();
    // Hook is enabled (and therefore allowed to hit the 2FA-source APIs).
    expect(mockUse2faSource).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('renders nothing for a user without integration:update and disables the hook', () => {
    mockHasPermission.mockReturnValue(false);

    const { container } = render(<TwoFactorSourceSelector />);

    expect(container).toBeEmptyDOMElement();
    // The hook must be disabled so no 2FA-source API is called without permission.
    expect(mockUse2faSource).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('fills the Sources popover width (visible at every breakpoint inside it)', () => {
    mockHasPermission.mockReturnValue(true);

    const { container } = render(<TwoFactorSourceSelector />);

    expect(container.firstElementChild).toHaveClass('flex', 'w-full');
  });

  it('renders nothing while the source/selection are still loading (no placeholder flash)', () => {
    mockHasPermission.mockReturnValue(true);
    mockUse2faSource.mockReturnValue({
      selectedSource: null,
      isLoading: true,
      availableSources: [source],
      setSource: vi.fn(),
      hasAnyConnection: true,
    });

    const { container } = render(<TwoFactorSourceSelector />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a labeled connect prompt when no bound integration is connected', () => {
    mockHasPermission.mockReturnValue(true);
    mockUse2faSource.mockReturnValue({
      selectedSource: null,
      isLoading: false,
      availableSources: [{ ...source, connected: false, connectionId: null }],
      setSource: vi.fn(),
      hasAnyConnection: false,
    });

    render(<TwoFactorSourceSelector />);
    expect(screen.getByText('2FA status')).toBeInTheDocument();
    expect(screen.getByText('Connect an integration')).toHaveAttribute(
      'href',
      '/org_1/integrations',
    );
  });
});

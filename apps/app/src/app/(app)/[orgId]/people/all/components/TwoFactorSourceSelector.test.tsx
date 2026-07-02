import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TwoFactorSourceSelector } from './TwoFactorSourceSelector';
import type { TwoFactorSourceProviderInfo } from '../hooks/use2faSource';

const { mockHasPermission, mockUse2faSource } = vi.hoisted(() => ({
  mockHasPermission: vi.fn(),
  mockUse2faSource: vi.fn(),
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

    expect(screen.getByText('Google Workspace')).toBeInTheDocument();
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

  it('renders nothing when no bound integration is connected', () => {
    mockHasPermission.mockReturnValue(true);
    mockUse2faSource.mockReturnValue({
      selectedSource: null,
      isLoading: false,
      availableSources: [{ ...source, connected: false, connectionId: null }],
      setSource: vi.fn(),
      hasAnyConnection: false,
    });

    const { container } = render(<TwoFactorSourceSelector />);
    expect(container).toBeEmptyDOMElement();
  });
});

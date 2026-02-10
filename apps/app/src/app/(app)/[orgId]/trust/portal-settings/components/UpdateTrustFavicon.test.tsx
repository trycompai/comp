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
    uploadFavicon: vi.fn(),
    removeFavicon: vi.fn(),
  }),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { UpdateTrustFavicon } from './UpdateTrustFavicon';

describe('UpdateTrustFavicon permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows upload button when user has portal:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<UpdateTrustFavicon currentFaviconUrl={null} />);
    expect(
      screen.getByRole('button', { name: /upload favicon/i }),
    ).toBeInTheDocument();
  });

  it('hides upload button when user lacks portal:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<UpdateTrustFavicon currentFaviconUrl={null} />);
    expect(
      screen.queryByRole('button', { name: /upload favicon/i }),
    ).not.toBeInTheDocument();
  });

  it('shows remove button when user has portal:update and a favicon exists', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(
      <UpdateTrustFavicon currentFaviconUrl="https://example.com/favicon.ico" />,
    );
    expect(
      screen.getByRole('button', { name: /remove/i }),
    ).toBeInTheDocument();
  });

  it('hides remove button when user lacks portal:update even if favicon exists', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(
      <UpdateTrustFavicon currentFaviconUrl="https://example.com/favicon.ico" />,
    );
    expect(
      screen.queryByRole('button', { name: /remove/i }),
    ).not.toBeInTheDocument();
  });

  it('hides both buttons when user has no permissions', () => {
    setMockPermissions({});
    render(
      <UpdateTrustFavicon currentFaviconUrl="https://example.com/favicon.ico" />,
    );
    expect(
      screen.queryByRole('button', { name: /upload favicon/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /remove/i }),
    ).not.toBeInTheDocument();
  });

  it('renders title regardless of permissions', () => {
    setMockPermissions({});
    render(<UpdateTrustFavicon currentFaviconUrl={null} />);
    expect(screen.getByText('Trust Portal Favicon')).toBeInTheDocument();
  });
});

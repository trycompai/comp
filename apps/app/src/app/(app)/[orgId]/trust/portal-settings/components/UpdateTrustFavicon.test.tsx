import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigationMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const trustPortalSettingsMock = vi.hoisted(() => ({
  uploadFavicon: vi.fn(),
  removeFavicon: vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    uploadFavicon: trustPortalSettingsMock.uploadFavicon,
    removeFavicon: trustPortalSettingsMock.removeFavicon,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: navigationMock.refresh }),
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
    trustPortalSettingsMock.uploadFavicon.mockResolvedValue({
      success: true,
      faviconUrl: 'https://example.com/new-favicon.png',
    });
    trustPortalSettingsMock.removeFavicon.mockResolvedValue({ success: true });
  });

  it('shows upload button when user has portal:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<UpdateTrustFavicon currentFaviconUrl={null} />);
    expect(screen.getByRole('button', { name: /upload favicon/i })).toBeInTheDocument();
  });

  it('hides upload button when user lacks portal:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<UpdateTrustFavicon currentFaviconUrl={null} />);
    expect(screen.queryByRole('button', { name: /upload favicon/i })).not.toBeInTheDocument();
  });

  it('shows remove button when user has portal:update and a favicon exists', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<UpdateTrustFavicon currentFaviconUrl="https://example.com/favicon.ico" />);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('hides remove button when user lacks portal:update even if favicon exists', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<UpdateTrustFavicon currentFaviconUrl="https://example.com/favicon.ico" />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('hides both buttons when user has no permissions', () => {
    setMockPermissions({});
    render(<UpdateTrustFavicon currentFaviconUrl="https://example.com/favicon.ico" />);
    expect(screen.queryByRole('button', { name: /upload favicon/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('renders title regardless of permissions', () => {
    setMockPermissions({});
    render(<UpdateTrustFavicon currentFaviconUrl={null} />);
    expect(screen.getByText('Trust Portal Favicon')).toBeInTheDocument();
  });

  it('uploads a favicon and refreshes settings', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const handleFaviconChange = vi.fn();
    const { container } = render(
      <UpdateTrustFavicon currentFaviconUrl={null} onFaviconChange={handleFaviconChange} />,
    );

    const fileInput = container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('file input not found');
    }

    const file = new File(['favicon'], 'favicon.png', { type: 'image/png' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(trustPortalSettingsMock.uploadFavicon).toHaveBeenCalledWith(
        'favicon.png',
        'image/png',
        expect.any(String),
      );
    });
    expect(handleFaviconChange).toHaveBeenCalledWith('https://example.com/new-favicon.png');
    expect(navigationMock.refresh).toHaveBeenCalled();
  });

  it('removes a favicon and refreshes settings', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const user = userEvent.setup();
    const handleFaviconChange = vi.fn();

    render(
      <UpdateTrustFavicon
        currentFaviconUrl="https://example.com/favicon.ico"
        onFaviconChange={handleFaviconChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(trustPortalSettingsMock.removeFavicon).toHaveBeenCalled();
    });
    expect(handleFaviconChange).toHaveBeenCalledWith(null);
    expect(navigationMock.refresh).toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useDevices
const mockRemoveDevice = vi.fn();
vi.mock('../hooks/useDevices', () => ({
  useDevices: () => ({
    removeDevice: mockRemoveDevice,
  }),
}));

// Mock RemoveDeviceAlert
vi.mock('../../all/components/RemoveDeviceAlert', () => ({
  RemoveDeviceAlert: ({ open }: { open: boolean }) =>
    open ? <div data-testid="remove-device-alert">Remove Alert</div> : null,
}));

// Mock @comp/ui components
vi.mock('@comp/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@comp/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <div data-testid="dropdown-item" onClick={onSelect} role="menuitem">
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Laptop: () => <span data-testid="laptop-icon" />,
  MoreHorizontal: () => <span data-testid="more-icon" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { DeviceDropdownMenu } from './DeviceDropdownMenu';

const mockHost = {
  id: 1,
  member_id: 'member-1',
  computer_name: 'MacBook Pro',
  hostname: 'macbook-pro',
  platform: 'darwin',
  os_version: '14.0',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  software: [],
  software_updated_at: '2024-01-01',
  detail_updated_at: '2024-01-01',
  label_updated_at: '2024-01-01',
  policy_updated_at: '2024-01-01',
  last_enrolled_at: '2024-01-01',
  seen_time: '2024-01-01',
  refetch_requested: false,
  uuid: 'uuid-1',
  osquery_version: '5.0',
  orbit_version: '1.0',
  fleet_desktop_version: '1.0',
  scripts_enabled: false,
  build: '',
  platform_like: 'darwin',
  code_name: '',
  uptime: 0,
  memory: 0,
  cpu_type: 'arm64',
} as any;

describe('DeviceDropdownMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('renders dropdown menu when user has member:delete permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      const { container } = render(
        <DeviceDropdownMenu host={mockHost} isCurrentUserOwner={false} />,
      );

      expect(container.innerHTML).not.toBe('');
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('returns null when user lacks member:delete permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      const { container } = render(
        <DeviceDropdownMenu host={mockHost} isCurrentUserOwner={false} />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('returns null when user has no permissions at all', () => {
      setMockPermissions(NO_PERMISSIONS);

      const { container } = render(
        <DeviceDropdownMenu host={mockHost} isCurrentUserOwner={false} />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('returns null when host has no member_id even with delete permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      const hostWithoutMember = { ...mockHost, member_id: undefined };

      const { container } = render(
        <DeviceDropdownMenu host={hostWithoutMember} isCurrentUserOwner={false} />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <DeviceDropdownMenu host={mockHost} isCurrentUserOwner={false} />,
      );

      expect(mockHasPermission).toHaveBeenCalledWith('member', 'delete');
    });
  });

  describe('Rendering with permission', () => {
    it('renders the Remove Device menu item', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <DeviceDropdownMenu host={mockHost} isCurrentUserOwner={false} />,
      );

      expect(screen.getByText('Remove Device')).toBeInTheDocument();
      expect(screen.getByTestId('laptop-icon')).toBeInTheDocument();
    });

    it('renders the more actions trigger button', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <DeviceDropdownMenu host={mockHost} isCurrentUserOwner={false} />,
      );

      expect(screen.getByTestId('more-icon')).toBeInTheDocument();
    });
  });
});

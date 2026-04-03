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

vi.mock('./FrameworkDeleteDialog', () => ({
  FrameworkDeleteDialog: () => <div data-testid="framework-delete-dialog" />,
}));

vi.mock('../../lib/utils', () => ({
  getControlStatus: () => 'not_started',
}));

import { FrameworkOverview } from './FrameworkOverview';

const baseProps = {
  frameworkInstanceWithControls: {
    id: 'fi_1',
    organizationId: 'org_123',
    frameworkId: 'fw_1',
    framework: {
      id: 'fw_1',
      name: 'SOC 2',
      description: 'SOC 2 Type II compliance framework',
    },
    controls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any,
  tasks: [],
};

describe('FrameworkOverview permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows delete dropdown menu when user has framework:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<FrameworkOverview {...baseProps} />);
    // The dropdown trigger button (MoreVertical icon) should be present
    const dropdownTrigger = screen.getByRole('button');
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it('hides delete dropdown menu when user lacks framework:delete permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<FrameworkOverview {...baseProps} />);
    // No button should exist (the only button is the dropdown trigger)
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides delete dropdown menu when user has no permissions', () => {
    setMockPermissions({});
    render(<FrameworkOverview {...baseProps} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders framework name regardless of permissions', () => {
    setMockPermissions({});
    render(<FrameworkOverview {...baseProps} />);
    expect(screen.getByText('SOC 2')).toBeInTheDocument();
  });
});

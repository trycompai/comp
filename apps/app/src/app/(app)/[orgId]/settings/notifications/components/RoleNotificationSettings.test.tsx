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

const mockSaveSettings = vi.fn();

vi.mock('../hooks/useRoleNotifications', () => ({
  useRoleNotifications: () => ({
    settings: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    saveSettings: mockSaveSettings,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, disabled, onClick, loading, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({ checked, disabled, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e: any) => onCheckedChange(e.target.checked)}
      data-testid="notification-checkbox"
    />
  ),
  HStack: ({ children }: any) => <div>{children}</div>,
  Section: ({ title, description, actions, children }: any) => (
    <div data-testid="section">
      <h2>{title}</h2>
      <p>{description}</p>
      {actions && <div data-testid="section-actions">{actions}</div>}
      {children}
    </div>
  ),
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

import { RoleNotificationSettings } from './RoleNotificationSettings';
import type { RoleNotificationConfig } from '../data/getRoleNotificationSettings';

const sampleSettings: RoleNotificationConfig[] = [
  {
    role: 'admin',
    label: 'Admin',
    isCustom: false,
    notifications: {
      policyNotifications: true,
      taskReminders: true,
      taskAssignments: true,
      taskMentions: true,
      weeklyTaskDigest: false,
      findingNotifications: true,
    },
  },
  {
    role: 'employee',
    label: 'Employee',
    isCustom: false,
    notifications: {
      policyNotifications: false,
      taskReminders: false,
      taskAssignments: false,
      taskMentions: false,
      weeklyTaskDigest: false,
      findingNotifications: false,
    },
  },
];

describe('RoleNotificationSettings permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables Save Changes button when user has organization:update permission and there are changes', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<RoleNotificationSettings initialSettings={sampleSettings} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    // Disabled because no changes have been made yet (hasChanges is false)
    expect(saveButton).toBeDisabled();
  });

  it('disables Save Changes button when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<RoleNotificationSettings initialSettings={sampleSettings} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('disables all checkboxes when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<RoleNotificationSettings initialSettings={sampleSettings} />);

    const checkboxes = screen.getAllByTestId('notification-checkbox');
    for (const checkbox of checkboxes) {
      expect(checkbox).toBeDisabled();
    }
  });

  it('enables checkboxes when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<RoleNotificationSettings initialSettings={sampleSettings} />);

    const checkboxes = screen.getAllByTestId('notification-checkbox');
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeDisabled();
    }
  });

  it('disables all checkboxes when user has no permissions', () => {
    setMockPermissions({});
    render(<RoleNotificationSettings initialSettings={sampleSettings} />);

    const checkboxes = screen.getAllByTestId('notification-checkbox');
    for (const checkbox of checkboxes) {
      expect(checkbox).toBeDisabled();
    }
  });

  it('displays role labels regardless of permissions', () => {
    setMockPermissions({});
    render(<RoleNotificationSettings initialSettings={sampleSettings} />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
  });
});

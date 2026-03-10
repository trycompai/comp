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

let mockPathname = '/org-1/settings/secrets';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('../secrets/components/AddSecretDialog', () => ({
  AddSecretDialog: () => <button data-testid="add-secret-dialog">Add Secret</button>,
}));

vi.mock('@trycompai/design-system', () => ({
  PageHeader: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions && <div data-testid="page-header-actions">{actions}</div>}
    </div>
  ),
  PageLayout: ({ header, children }: any) => (
    <div data-testid="page-layout">
      {header}
      {children}
    </div>
  ),
}));

import { SettingsTabs } from './SettingsTabs';

describe('SettingsTabs permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/org-1/settings/secrets';
  });

  it('shows AddSecretDialog action on secrets page when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(
      <SettingsTabs orgId="org-1" showBrowserTab={false}>
        <div>child content</div>
      </SettingsTabs>,
    );

    expect(screen.getByTestId('add-secret-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('page-header-actions')).toBeInTheDocument();
  });

  it('hides AddSecretDialog action on secrets page when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(
      <SettingsTabs orgId="org-1" showBrowserTab={false}>
        <div>child content</div>
      </SettingsTabs>,
    );

    expect(screen.queryByTestId('add-secret-dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-header-actions')).not.toBeInTheDocument();
  });

  it('hides AddSecretDialog action when user has no permissions', () => {
    setMockPermissions({});
    render(
      <SettingsTabs orgId="org-1" showBrowserTab={false}>
        <div>child content</div>
      </SettingsTabs>,
    );

    expect(screen.queryByTestId('add-secret-dialog')).not.toBeInTheDocument();
  });

  it('does not show AddSecretDialog on non-secrets pages even with admin permissions', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    mockPathname = '/org-1/settings/api-keys';
    render(
      <SettingsTabs orgId="org-1" showBrowserTab={false}>
        <div>child content</div>
      </SettingsTabs>,
    );

    expect(screen.queryByTestId('add-secret-dialog')).not.toBeInTheDocument();
  });

  it('renders children directly when path matches own-layout pattern', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    mockPathname = '/org-1/settings/roles/new';
    render(
      <SettingsTabs orgId="org-1" showBrowserTab={false}>
        <div data-testid="child-content">child content</div>
      </SettingsTabs>,
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByTestId('page-layout')).not.toBeInTheDocument();
  });
});

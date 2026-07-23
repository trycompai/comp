import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from './connection-format';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ permissions: {}, hasPermission: mockHasPermission }),
}));

vi.mock('@/lib/api-client', () => ({
  // Never resolves, so the passed initialProfiles stay in state for the assertion.
  apiClient: {
    get: vi.fn(() => new Promise(() => undefined)),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    iconLeft,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { iconLeft?: ReactNode; loading?: boolean }) => (
    <button {...props}>
      {iconLeft}
      {children}
    </button>
  ),
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Spinner: () => <span data-testid="spinner" />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
}));

// Sub-components are covered on their own; stub them to focus on the client.
vi.mock('./ConnectionsTable', () => ({
  ConnectionsTable: ({ connections }: { connections: Connection[] }) => (
    <div data-testid="table">{connections.length} rows</div>
  ),
}));
vi.mock('./ManageConnectionSheet', () => ({ ManageConnectionSheet: () => null }));
vi.mock('./BrowserConnectionLiveView', () => ({ BrowserConnectionLiveView: () => null }));

import { BrowserConnectionClient } from './BrowserConnectionClient';

const profile: Connection = {
  id: 'bap_1',
  hostname: 'github.com',
  loginIdentity: 'ci-bot@acme.com',
  displayName: 'GitHub',
  status: 'verified',
  vaultExternalItemRef: 'op://vault/item',
};

describe('BrowserConnectionClient permission gating', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "Connect a vendor" and the table when the user can create integrations', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserConnectionClient organizationId="org-1" initialProfiles={[profile]} />);

    expect(screen.getByRole('button', { name: /connect a vendor/i })).toBeInTheDocument();
    expect(screen.getByTestId('table')).toHaveTextContent('1 rows');
  });

  it('hides "Connect a vendor" for a read-only user but still lists connections', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<BrowserConnectionClient organizationId="org-1" initialProfiles={[profile]} />);

    expect(screen.queryByRole('button', { name: /connect a vendor/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('table')).toBeInTheDocument();
  });

  it('shows an empty state when there are no connections', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserConnectionClient organizationId="org-1" initialProfiles={[]} />);

    expect(screen.getByText(/no connections yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('table')).not.toBeInTheDocument();
  });
});

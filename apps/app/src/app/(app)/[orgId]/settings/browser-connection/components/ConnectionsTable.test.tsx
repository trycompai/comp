import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));
vi.mock('@trycompai/design-system/icons', () => ({
  Renew: () => <span />,
  Settings: () => <span />,
}));
vi.mock('@/components/VendorLogo', () => ({
  VendorLogo: () => <span data-testid="vendor-logo" />,
}));

import type { Connection } from './connection-format';
import { ConnectionsTable } from './ConnectionsTable';

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'bap_1',
    hostname: 'github.com',
    loginIdentity: 'ci-bot@acme.com',
    displayName: 'GitHub',
    status: 'verified',
    vaultProvider: '1password',
    vaultExternalItemRef: 'op://vault/item',
    ...overrides,
  };
}

const base = {
  canManage: true,
  totpStatuses: {} as Record<string, boolean>,
  statusesLoading: false,
  onReconnect: vi.fn(),
  onManage: vi.fn(),
  onMakePermanent: vi.fn(),
};

describe('ConnectionsTable — permanence states', () => {
  it('shows "Stays signed in" and no upgrade action when a key is stored', () => {
    render(
      <ConnectionsTable
        {...base}
        connections={[connection()]}
        totpStatuses={{ bap_1: true }}
      />,
    );
    expect(screen.getByText('Stays signed in')).toBeInTheDocument();
    expect(screen.getByText(/Signs back in on its own/i)).toBeInTheDocument();
    expect(screen.queryByText('Make permanent')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
  });

  it('flags a password connection with no key as at-risk and offers Make permanent', () => {
    const onMakePermanent = vi.fn();
    render(
      <ConnectionsTable
        {...base}
        connections={[connection()]}
        totpStatuses={{ bap_1: false }}
        onMakePermanent={onMakePermanent}
      />,
    );
    expect(screen.getByText('Signed in for now')).toBeInTheDocument();
    expect(screen.getByText(/Add your authenticator key/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Make permanent'));
    expect(onMakePermanent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bap_1' }),
    );
  });

  it('treats an SSO connection as neutral with no upgrade path', () => {
    render(
      <ConnectionsTable
        {...base}
        connections={[
          connection({ vaultProvider: null, vaultExternalItemRef: null }),
        ]}
      />,
    );
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText(/Signs in through SSO/i)).toBeInTheDocument();
    expect(screen.queryByText('Make permanent')).not.toBeInTheDocument();
  });

  it('offers Reconnect for a paused connection', () => {
    const onReconnect = vi.fn();
    render(
      <ConnectionsTable
        {...base}
        connections={[connection({ status: 'needs_reauth' })]}
        totpStatuses={{ bap_1: true }}
        onReconnect={onReconnect}
      />,
    );
    expect(screen.getByText('Reconnect needed')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Reconnect'));
    expect(onReconnect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bap_1' }),
    );
  });

  it('shows a Checking… placeholder for a password row until status loads', () => {
    render(
      <ConnectionsTable
        {...base}
        connections={[connection()]}
        totpStatuses={{}}
        statusesLoading
      />,
    );
    expect(screen.getByText('Checking…')).toBeInTheDocument();
    // We don't know yet, so don't prompt to add a key.
    expect(screen.queryByText('Make permanent')).not.toBeInTheDocument();
  });

  it('hides mutation actions for a view-only user but keeps Manage', () => {
    render(
      <ConnectionsTable
        {...base}
        canManage={false}
        connections={[connection({ status: 'needs_reauth' })]}
        totpStatuses={{ bap_1: false }}
      />,
    );
    expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    expect(screen.queryByText('Make permanent')).not.toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });
});

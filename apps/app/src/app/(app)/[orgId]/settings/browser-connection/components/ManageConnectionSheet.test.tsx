import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub the DS Sheet family + controls to simple pass-throughs (render when open).
vi.mock('@trycompai/design-system', () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetClose: ({ children, ...props }: any) => (
    <button aria-label={props['aria-label']}>{children}</button>
  ),
  SheetBody: ({ children }: any) => <div>{children}</div>,
  SheetFooter: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
}));
vi.mock('@trycompai/design-system/icons', () => ({
  Close: () => <span />,
  Locked: () => <span />,
}));
vi.mock('@/components/VendorLogo', () => ({
  VendorLogo: () => <span data-testid="vendor-logo" />,
}));

import type { Connection } from './connection-format';
import { ManageConnectionSheet } from './ManageConnectionSheet';

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'bap_1',
    hostname: 'github.com',
    loginIdentity: 'ci-bot@acme.com',
    displayName: 'github.com browser profile',
    status: 'verified',
    vaultProvider: '1password',
    vaultExternalItemRef: 'op://vault/item',
    automationCount: 3,
    ...overrides,
  };
}

const base = {
  open: true,
  onOpenChange: vi.fn(),
  canManage: true,
  canRemove: true,
  busy: false,
  onReconnect: vi.fn(),
  onRename: vi.fn(),
  onChangeLogin: vi.fn(),
  onRemove: vi.fn(),
};

describe('ManageConnectionSheet', () => {
  it('renders a password connection with its credentials and manage actions', () => {
    render(<ManageConnectionSheet {...base} connection={connection()} />);
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Secured by 1Password')).toBeInTheDocument();
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
    expect(screen.getByText('Change login')).toBeInTheDocument();
    expect(screen.getByText('Remove…')).toBeInTheDocument();
  });

  it('hides "Change login" and the credentials row for an SSO connection', () => {
    render(
      <ManageConnectionSheet
        {...base}
        connection={connection({ vaultProvider: null, vaultExternalItemRef: null })}
      />,
    );
    expect(screen.getByText('SSO')).toBeInTheDocument();
    expect(screen.queryByText('Secured by 1Password')).not.toBeInTheDocument();
    expect(screen.queryByText('Change login')).not.toBeInTheDocument();
  });

  it('shows a view-only note and no actions when the user cannot manage', () => {
    render(<ManageConnectionSheet {...base} canManage={false} connection={connection()} />);
    expect(screen.getByText(/view access/i)).toBeInTheDocument();
    expect(screen.queryByText('Reconnect')).not.toBeInTheDocument();
    expect(screen.queryByText('Remove…')).not.toBeInTheDocument();
  });

  it('confirms before removing, warning about dependent automations', () => {
    render(<ManageConnectionSheet {...base} connection={connection({ automationCount: 3 })} />);
    fireEvent.click(screen.getByText('Remove…'));
    expect(screen.getByText(/3 automations that rely on it stop running/i)).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('surfaces the blocked reason in the header', () => {
    render(
      <ManageConnectionSheet
        {...base}
        connection={connection({ status: 'blocked', blockedReason: 'Verification required' })}
      />,
    );
    expect(screen.getByText('Verification required')).toBeInTheDocument();
  });
});

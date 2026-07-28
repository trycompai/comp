import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetClose: ({ children, ...props }: any) => (
    <button aria-label={props['aria-label']}>{children}</button>
  ),
  SheetBody: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Input: (props: any) => <input {...props} />,
}));
vi.mock('@trycompai/design-system/icons', () => ({
  Checkmark: () => <span />,
  Close: () => <span />,
  Locked: () => <span />,
  View: () => <span />,
  ViewOff: () => <span />,
}));
vi.mock('../../../tasks/[taskId]/components/browser-automations/MfaSetupHelp', () => ({
  MfaSetupHelp: () => <div data-testid="mfa-help" />,
}));

import type { Connection } from './connection-format';
import { MakePermanentSheet } from './MakePermanentSheet';

const connection: Connection = {
  id: 'bap_1',
  hostname: 'github.com',
  loginIdentity: 'ci-bot@acme.com',
  displayName: 'GitHub',
  status: 'verified',
  vaultProvider: '1password',
  vaultExternalItemRef: 'op://vault/item',
};

const base = {
  connection,
  open: true,
  onOpenChange: vi.fn(),
};

describe('MakePermanentSheet', () => {
  it('rejects a rotating 6-digit code without calling onSave', () => {
    const onSave = vi.fn();
    render(<MakePermanentSheet {...base} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/JBSW/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByText('Save key'));

    expect(screen.getByText(/rotating 6-digit code/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a too-short key without calling onSave', () => {
    const onSave = vi.fn();
    render(<MakePermanentSheet {...base} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/JBSW/i), {
      target: { value: 'ABCDEF' },
    });
    fireEvent.click(screen.getByText('Save key'));

    expect(screen.getByText(/16 characters or longer/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a valid key (trimmed) and shows the permanent success state', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<MakePermanentSheet {...base} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/JBSW/i), {
      target: { value: '  JBSWY3DPEHPK3PXP  ' },
    });
    fireEvent.click(screen.getByText('Save key'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bap_1' }),
      'JBSWY3DPEHPK3PXP',
    );
    expect(
      await screen.findByText(/now stays signed in on its own/i),
    ).toBeInTheDocument();
  });

  it('returns to the form when the save fails', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<MakePermanentSheet {...base} onSave={onSave} />);

    fireEvent.change(screen.getByPlaceholderText(/JBSW/i), {
      target: { value: 'JBSWY3DPEHPK3PXP' },
    });
    fireEvent.click(screen.getByText('Save key'));

    // Back on the form (Save key button reappears), no success screen.
    await waitFor(() => expect(screen.getByText('Save key')).toBeInTheDocument());
    expect(
      screen.queryByText(/now stays signed in on its own/i),
    ).not.toBeInTheDocument();
  });
});

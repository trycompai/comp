import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Checkmark: () => <span />,
  Close: () => <span />,
  Locked: () => <span />,
}));

vi.mock('./LiveActivityBorder', () => ({ LiveActivityBorder: () => <div /> }));
vi.mock('./StepList', () => ({ StepList: () => <div /> }));

import { ConnectLiveSignin } from './ConnectLiveSignin';

const baseProps = {
  host: 'github.com',
  liveViewUrl: 'https://live-view/1',
  steps: [],
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

describe('ConnectLiveSignin — 2FA take-over guidance', () => {
  it('defaults to entering a code, with a confirm button', () => {
    render(
      <ConnectLiveSignin {...baseProps} variant="2fa" twoFactorMethod="code" />,
    );
    expect(screen.getByText('Enter the code in the page')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entered it/i }),
    ).toBeInTheDocument();
  });

  it('tells the user to switch off a passkey when another method is available', () => {
    render(
      <ConnectLiveSignin {...baseProps} variant="2fa" twoFactorMethod="passkey" />,
    );
    expect(screen.getByText('Switch to a code method')).toBeInTheDocument();
    // Points them at the vendor's own "use another method" control.
    expect(screen.getByText(/More options/)).toBeInTheDocument();
    // They can still complete it, so the confirm button stays.
    expect(
      screen.getByRole('button', { name: /entered it/i }),
    ).toBeInTheDocument();
  });

  it('warns and hides the confirm button when the login is passkey-only', () => {
    render(
      <ConnectLiveSignin
        {...baseProps}
        variant="2fa"
        twoFactorMethod="passkey_only"
      />,
    );
    expect(screen.getByText('Passkey-only login')).toBeInTheDocument();
    expect(screen.getByText(/can't be completed/i)).toBeInTheDocument();
    // Nothing here for the user to complete — don't offer a misleading button.
    expect(
      screen.queryByRole('button', { name: /entered it/i }),
    ).not.toBeInTheDocument();
  });
});

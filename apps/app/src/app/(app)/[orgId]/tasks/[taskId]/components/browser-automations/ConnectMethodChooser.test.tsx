import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { LoginAnalysis } from '../../hooks/types';

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { ConnectMethodChooser } from './ConnectMethodChooser';

function analysisWith(methods: LoginAnalysis['detectedMethods']): LoginAnalysis {
  return {
    reachable: true,
    detectedMethods: methods,
    identifierType: 'email',
    extraFields: [],
    recommendation: { category: 'ready', headline: 'h', detail: 'd' },
  };
}

describe('ConnectMethodChooser', () => {
  it('lists usable methods (password recommended), never a passkey option, and warns about passkey', () => {
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'sso', 'passkey'])}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Email & password')).toBeInTheDocument();
    expect(screen.getByText('Single sign-on (SSO)')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    // Passkey is never a selectable option, but we warn it's present + won't work.
    expect(screen.getByText(/won.t work in Comp.s browser/i)).toBeInTheDocument();
  });

  it('continues with the selected method (password default)', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'sso'])}
        onChoose={onChoose}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Continue'));
    expect(onChoose).toHaveBeenCalledWith('password');
  });

  it('continues with SSO once selected', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'sso'])}
        onChoose={onChoose}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Single sign-on (SSO)'));
    fireEvent.click(screen.getByText('Continue'));
    expect(onChoose).toHaveBeenCalledWith('sso');
  });

  it('shows no passkey warning when none is offered, and no "unattended" warning for SSO', () => {
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['sso'])}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/won.t work in Comp.s browser/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/can.t run fully unattended/i)).not.toBeInTheDocument();
  });

  it('explains a passkey-only site and offers manual capture (no dead end)', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['passkey'])}
        onChoose={onChoose}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/only supports passkey/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Capture evidence manually'));
    expect(onChoose).toHaveBeenCalledWith('live');
  });

  it('falls back to a manual sign-in when nothing is detected', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser analysis={analysisWith([])} onChoose={onChoose} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByText('Sign in manually'));
    expect(onChoose).toHaveBeenCalledWith('live');
  });
});

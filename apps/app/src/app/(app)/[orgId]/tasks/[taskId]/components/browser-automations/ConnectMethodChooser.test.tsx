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

vi.mock('@trycompai/design-system/icons', () => ({
  ArrowRight: () => <span data-testid="icon-arrow" />,
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
  it('lists detected methods with password recommended first', () => {
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'sso', 'passkey'])}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('Email & password')).toBeInTheDocument();
    expect(screen.getByText('Single sign-on (SSO)')).toBeInTheDocument();
    expect(screen.getByText('Passkey')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('routes the password option to the automated path', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'sso'])}
        onChoose={onChoose}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Email & password'));
    expect(onChoose).toHaveBeenCalledWith('password');
  });

  it('routes SSO to the live browser path', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'sso'])}
        onChoose={onChoose}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Single sign-on (SSO)'));
    expect(onChoose).toHaveBeenCalledWith('live');
  });

  it('warns up front when no unattended method is available (SSO/passkey only)', () => {
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['sso', 'passkey'])}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/can.t run fully unattended/i)).toBeInTheDocument();
  });

  it('does not warn when password (unattended) is available', () => {
    render(
      <ConnectMethodChooser
        analysis={analysisWith(['password', 'passkey'])}
        onChoose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByText(/can.t run fully unattended/i)).not.toBeInTheDocument();
  });

  it('falls back to a manual option when nothing is detected', () => {
    const onChoose = vi.fn();
    render(
      <ConnectMethodChooser
        analysis={analysisWith([])}
        onChoose={onChoose}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Sign in manually'));
    expect(onChoose).toHaveBeenCalledWith('live');
  });
});

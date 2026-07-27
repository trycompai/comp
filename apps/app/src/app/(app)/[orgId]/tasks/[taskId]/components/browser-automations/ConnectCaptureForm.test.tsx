import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Button: ({
    children,
    type,
    onClick,
    disabled,
  }: {
    children?: ReactNode;
    type?: 'button' | 'submit';
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="icon-add" />,
  Close: () => <span data-testid="icon-close" />,
  Locked: () => <span data-testid="icon-lock" />,
}));

import type { LoginAnalysis } from '../../hooks/types';
import { ConnectCaptureForm } from './ConnectCaptureForm';

function analysis(overrides: Partial<LoginAnalysis> = {}): LoginAnalysis {
  return {
    reachable: true,
    detectedMethods: ['password'],
    identifierType: 'email',
    extraFields: [],
    recommendation: { category: 'ready', headline: '', detail: '' },
    ...overrides,
  };
}

describe('ConnectCaptureForm', () => {
  it('falls back to a generic username/password form with no detection', () => {
    render(<ConnectCaptureForm isSubmitting={false} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    // The authenticator key is progressive — hidden until the checkbox is ticked.
    expect(screen.queryByLabelText('Authenticator setup key')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByLabelText('Authenticator setup key')).toBeInTheDocument();
  });

  it('renders exactly the detected fields, in order, with their labels (1A)', () => {
    render(
      <ConnectCaptureForm
        isSubmitting={false}
        onSubmit={vi.fn()}
        analysis={analysis({
          identifierType: 'username',
          extraFields: [{ label: 'Account ID or alias' }, { label: 'IAM username' }],
        })}
      />,
    );
    expect(screen.getByLabelText('Account ID or alias')).toBeInTheDocument();
    expect(screen.getByLabelText('IAM username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // No redundant generic identifier when a detected field IS the identifier.
    expect(screen.queryByLabelText('Username or email')).not.toBeInTheDocument();
  });

  it('maps the detected fields back to the sign-in contract on submit', async () => {
    const onSubmit = vi.fn();
    render(
      <ConnectCaptureForm
        isSubmitting={false}
        onSubmit={onSubmit}
        analysis={analysis({
          identifierType: 'username',
          extraFields: [{ label: 'Account ID or alias' }, { label: 'IAM username' }],
        })}
      />,
    );
    fireEvent.change(screen.getByLabelText('Account ID or alias'), {
      target: { value: 'acme-prod' },
    });
    fireEvent.change(screen.getByLabelText('IAM username'), {
      target: { value: 'audit-bot' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'sup3r-secret' } });
    fireEvent.click(screen.getByText('Sign in for me'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      username: 'audit-bot',
      password: 'sup3r-secret',
      totpSeed: undefined,
      extraFields: [{ label: 'Account ID or alias', value: 'acme-prod' }],
      usernameLabel: 'IAM username',
    });
  });

  it('does not submit while a required field is empty', async () => {
    const onSubmit = vi.fn();
    render(<ConnectCaptureForm isSubmitting={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Sign in for me'));

    await waitFor(() => expect(screen.getAllByText('Required').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

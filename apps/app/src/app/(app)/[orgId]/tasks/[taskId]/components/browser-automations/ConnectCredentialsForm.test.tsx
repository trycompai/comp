import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { InputHTMLAttributes, LabelHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  // Forward only the props the tests exercise; ignore DS-only props (loading, variant).
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
  ArrowRight: () => <span data-testid="icon-arrow" />,
  Locked: () => <span data-testid="icon-lock" />,
  View: () => <span data-testid="icon-view" />,
  ViewOff: () => <span data-testid="icon-view-off" />,
}));

import { ConnectCredentialsForm } from './ConnectCredentialsForm';

describe('ConnectCredentialsForm', () => {
  it('renders the credential fields and the 1Password reassurance', () => {
    render(<ConnectCredentialsForm isSubmitting={false} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator app setup key')).toBeInTheDocument();
    expect(screen.getByText(/stored in/i)).toHaveTextContent('1Password');
  });

  it('submits the entered credentials', async () => {
    const onSubmit = vi.fn();
    render(
      <ConnectCredentialsForm
        initialUrl="https://github.com"
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Username or email'), {
      target: { value: 'compliance@acme.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'sup3r-secret' },
    });
    fireEvent.change(screen.getByLabelText('Authenticator app setup key'), {
      target: { value: 'JBSWY3DPEHPK3PXP' },
    });
    fireEvent.click(screen.getByText('Continue to sign-in'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://github.com',
        username: 'compliance@acme.com',
        password: 'sup3r-secret',
        totpSeed: 'JBSWY3DPEHPK3PXP',
      }),
      expect.anything(),
    );
  });

  it('does not submit when required fields are missing', async () => {
    const onSubmit = vi.fn();
    render(<ConnectCredentialsForm isSubmitting={false} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Continue to sign-in'));

    await waitFor(() => expect(screen.getByText('Username is required')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('toggles password visibility', () => {
    render(<ConnectCredentialsForm isSubmitting={false} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<ConnectCredentialsForm isSubmitting={false} onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

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
  Locked: () => <span data-testid="icon-lock" />,
}));

import { ConnectCaptureForm } from './ConnectCaptureForm';

describe('ConnectCaptureForm', () => {
  it('renders the credential fields', () => {
    render(<ConnectCaptureForm isSubmitting={false} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Authenticator setup key')).toBeInTheDocument();
  });

  it('submits the entered details', async () => {
    const onSubmit = vi.fn();
    render(<ConnectCaptureForm isSubmitting={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Username or email'), {
      target: { value: 'sam@acme.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'sup3r-secret' },
    });
    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'sam@acme.com', password: 'sup3r-secret' }),
      expect.anything(),
    );
  });

  it('does not submit without the required fields', async () => {
    const onSubmit = vi.fn();
    render(<ConnectCaptureForm isSubmitting={false} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Save & Finish'));

    await waitFor(() => expect(screen.getByText('Username is required')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

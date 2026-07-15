import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockChangeEmail = vi.fn();

vi.mock('@/utils/auth-client', () => ({
  authClient: {
    changeEmail: (...args: unknown[]) => mockChangeEmail(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, ...props }: HTMLAttributes<HTMLButtonElement> & { disabled?: boolean; type?: 'submit' | 'button' }) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: HTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Section: ({
    title,
    description,
    children,
  }: {
    title?: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
  Stack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}));

import { toast } from 'sonner';
import { LoginEmailSettings } from './LoginEmailSettings';

const CURRENT_EMAIL = 'admin@old-domain.com';

const submitWithEmail = async (email: string) => {
  fireEvent.change(screen.getByLabelText('New email address'), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
};

describe('LoginEmailSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the current login email', () => {
    render(<LoginEmailSettings currentEmail={CURRENT_EMAIL} />);
    expect(
      screen.getByText(`You currently sign in as ${CURRENT_EMAIL}.`),
    ).toBeInTheDocument();
  });

  it('requests the change and shows the pending notice on success', async () => {
    mockChangeEmail.mockResolvedValue({ data: { status: true }, error: null });
    render(<LoginEmailSettings currentEmail={CURRENT_EMAIL} />);

    await submitWithEmail('Admin@New-Domain.com');

    await waitFor(() => {
      expect(mockChangeEmail).toHaveBeenCalledWith({
        newEmail: 'admin@new-domain.com',
        callbackURL: `${window.location.origin}/`,
      });
    });
    expect(toast.success).toHaveBeenCalledWith(
      `Confirmation link sent to ${CURRENT_EMAIL}`,
    );
    expect(
      screen.getByText(/We sent a confirmation link to admin@old-domain.com/),
    ).toBeInTheDocument();
  });

  it('rejects the current email as the new address', async () => {
    render(<LoginEmailSettings currentEmail={CURRENT_EMAIL} />);

    await submitWithEmail(CURRENT_EMAIL.toUpperCase());

    expect(
      await screen.findByText('This is already your login email'),
    ).toBeInTheDocument();
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without calling the API', async () => {
    render(<LoginEmailSettings currentEmail={CURRENT_EMAIL} />);

    await submitWithEmail('not-an-email');

    expect(
      await screen.findByText('Enter a valid email address'),
    ).toBeInTheDocument();
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it('surfaces API errors as a toast', async () => {
    mockChangeEmail.mockResolvedValue({
      data: null,
      error: { message: 'Change email is disabled' },
    });
    render(<LoginEmailSettings currentEmail={CURRENT_EMAIL} />);

    await submitWithEmail('someone@new-domain.com');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Change email is disabled');
    });
    expect(
      screen.queryByText(/We sent a confirmation link/),
    ).not.toBeInTheDocument();
  });
});

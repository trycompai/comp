import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  HStack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Stack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { ExceptionReasonForm } from './ExceptionReasonForm';

describe('ExceptionReasonForm', () => {
  it('disables Save until a non-empty reason is entered', () => {
    render(<ExceptionReasonForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const save = screen.getByRole('button', { name: /save exception/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '   ' },
    });
    expect(save).toBeDisabled(); // whitespace only

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'No company device issued' },
    });
    expect(save).toBeEnabled();
  });

  it('submits the trimmed reason', () => {
    const onSubmit = vi.fn();
    render(<ExceptionReasonForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '  No company device issued  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save exception/i }));

    expect(onSubmit).toHaveBeenCalledWith('No company device issued');
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(<ExceptionReasonForm onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});

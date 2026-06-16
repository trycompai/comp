import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// ─── Mock design system ──────────────────────────────────────────
vi.mock('@trycompai/design-system', () => ({
  HStack: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  AlertDialog: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  TrashCan: () => <span data-testid="trash-icon" />,
}));

import { IsmsRowActions } from './IsmsRowActions';

const baseProps = {
  onSave: vi.fn(),
  onDelete: vi.fn(),
  isDirty: true,
  isSaving: false,
  isDeleting: false,
  deleteLabel: 'Delete objective',
};

describe('IsmsRowActions', () => {
  it('does not call onDelete until the confirm dialog is accepted', () => {
    const onDelete = vi.fn();
    render(<IsmsRowActions {...baseProps} onDelete={onDelete} />);

    // Clicking the trash button opens the confirm, but does NOT delete yet.
    fireEvent.click(screen.getByLabelText('Delete objective'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this row?')).toBeInTheDocument();

    // Confirming runs the delete.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('cancelling the confirm dialog does not delete the row', () => {
    const onDelete = vi.fn();
    render(<IsmsRowActions {...baseProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByLabelText('Delete objective'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('save is gated on dirty state and runs immediately (no confirm)', () => {
    const onSave = vi.fn();
    render(<IsmsRowActions {...baseProps} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

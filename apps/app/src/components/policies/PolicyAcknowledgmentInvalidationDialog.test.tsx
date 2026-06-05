import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  getPolicyAcknowledgmentCount,
  getPolicyAcknowledgmentTotal,
  PolicyAcknowledgmentInvalidationDialog,
} from './PolicyAcknowledgmentInvalidationDialog';

describe('PolicyAcknowledgmentInvalidationDialog', () => {
  it('shows the invalidation count and confirm copy', () => {
    render(
      <PolicyAcknowledgmentInvalidationDialog
        acknowledgmentCount={3}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open={true}
      />,
    );

    expect(screen.getByText('Invalidate policy acknowledgments?')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish and invalidate' })).toBeInTheDocument();
  });

  it('calls confirm only when the destructive action is accepted', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <PolicyAcknowledgmentInvalidationDialog
        acknowledgmentCount={2}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
        open={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Publish and invalidate' }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not confirm when the dialog is canceled', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <PolicyAcknowledgmentInvalidationDialog
        acknowledgmentCount={2}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not render when there are no acknowledgments to invalidate', () => {
    const { container } = render(
      <PolicyAcknowledgmentInvalidationDialog
        acknowledgmentCount={0}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
        open={true}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('counts acknowledgments defensively', () => {
    expect(getPolicyAcknowledgmentCount({ signedBy: ['user-1', 'user-2'] })).toBe(2);
    expect(getPolicyAcknowledgmentCount({ signedBy: null })).toBe(0);
    expect(
      getPolicyAcknowledgmentTotal([
        { signedBy: ['user-1'] },
        { signedBy: ['user-2', 'user-3'] },
        {},
      ]),
    ).toBe(3);
  });
});

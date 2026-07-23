import { fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BrowserAutomationDraft } from '../../hooks/types';

vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    iconLeft,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { iconLeft?: ReactNode }) => (
    <button {...props}>
      {iconLeft}
      {children}
    </button>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Play: () => <span data-testid="play-icon" />,
  TrashCan: () => <span data-testid="trash-icon" />,
}));

import { DraftsStrip } from './DraftsStrip';

const draft: BrowserAutomationDraft = {
  id: 'bad_1',
  taskId: 'tsk_1',
  name: '2FA enforcement',
  steps: [{ instruction: 'a' }, { instruction: 'b' }],
  createdAt: '',
  updatedAt: '',
};

describe('DraftsStrip', () => {
  it('renders nothing when there are no drafts', () => {
    const { container } = render(
      <DraftsStrip drafts={[]} onContinue={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a draft with its name and step count, and fires Continue/Delete', () => {
    const onContinue = vi.fn();
    const onDelete = vi.fn();
    render(<DraftsStrip drafts={[draft]} onContinue={onContinue} onDelete={onDelete} />);

    expect(screen.getByText('2FA enforcement')).toBeInTheDocument();
    expect(screen.getByText('2 steps')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(onContinue).toHaveBeenCalledWith(draft);

    fireEvent.click(screen.getByRole('button', { name: /delete draft/i }));
    expect(onDelete).toHaveBeenCalledWith(draft);
  });
});

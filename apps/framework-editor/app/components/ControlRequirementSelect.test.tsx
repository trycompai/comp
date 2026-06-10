import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ControlRequirementSelect,
  type RequirementOption,
} from './ControlRequirementSelect';

vi.mock('@trycompai/ui', () => ({
  Button: ({
    children,
    variant: _v,
    size: _s,
    ...props
  }: { variant?: string; size?: string } & React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const REQS: RequirementOption[] = [
  { id: 'req_1', identifier: 'AC-1', name: 'First' },
  { id: 'req_2', identifier: 'AC-2', name: 'Second' },
  { id: 'req_3', identifier: 'AC-2b', name: 'Newest' },
];

function setup(overrides: Partial<Parameters<typeof ControlRequirementSelect>[0]> = {}) {
  const onConfirm = vi.fn();
  const onBack = vi.fn();
  render(
    <ControlRequirementSelect
      controlName="Assign account managers"
      requirements={REQS}
      isLoading={false}
      isLinking={false}
      onBack={onBack}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onBack };
}

describe('ControlRequirementSelect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('disables the confirm button until at least one requirement is selected', () => {
    setup();
    const confirm = screen.getByRole('button', {
      name: /Link to .*requirement/i,
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);

    fireEvent.click(screen.getByText('AC-2b — Newest'));
    expect(confirm.disabled).toBe(false);
  });

  it('confirms with only the selected requirement ids', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByText('AC-1 — First'));
    fireEvent.click(screen.getByText('AC-2b — Newest'));
    fireEvent.click(screen.getByRole('button', { name: /Link to 2 requirements/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].sort()).toEqual(['req_1', 'req_3']);
  });

  it('renders requirements in the given order (newest last)', () => {
    setup();
    const labels = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter((t) => t?.includes('—'));
    expect(labels[labels.length - 1]).toContain('Newest');
  });

  it('filters by search text', () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText('Search requirements...'), {
      target: { value: 'newest' },
    });
    expect(screen.queryByText('AC-1 — First')).toBeNull();
    expect(screen.getByText('AC-2b — Newest')).toBeTruthy();
  });

  it('calls onBack', () => {
    const { onBack } = setup();
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

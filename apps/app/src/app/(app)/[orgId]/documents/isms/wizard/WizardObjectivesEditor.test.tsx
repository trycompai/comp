import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Button: ({
    children,
    onClick,
    type,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} aria-label={ariaLabel} type={type}>
      {children}
    </button>
  ),
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span />,
  TrashCan: () => <span />,
}));

import { WizardObjectivesEditor, type WizardObjective } from './WizardObjectivesEditor';

function Harness({ initial }: { initial: WizardObjective[] }) {
  const [items, setItems] = useState<WizardObjective[]>(initial);
  return <WizardObjectivesEditor items={items} onChange={setItems} />;
}

const seed: WizardObjective[] = [
  { objective: 'A', target: '1' },
  { objective: 'B', target: '2' },
  { objective: 'C', target: '3' },
];

describe('WizardObjectivesEditor', () => {
  it('renders one editable objective+target pair per row', () => {
    render(<Harness initial={seed} />);
    expect((screen.getByLabelText('Objective 1') as HTMLInputElement).value).toBe('A');
    expect((screen.getByLabelText('Target 2') as HTMLInputElement).value).toBe('2');
    expect((screen.getByLabelText('Objective 3') as HTMLInputElement).value).toBe('C');
  });

  it('keeps stable input ids across re-renders so React reconciles by identity', () => {
    render(<Harness initial={seed} />);
    const firstId = (screen.getByLabelText('Objective 1') as HTMLInputElement).id;

    fireEvent.change(screen.getByLabelText('Objective 1'), { target: { value: 'A2' } });

    // Same DOM node identity (id) survives the edit-driven re-render.
    expect((screen.getByLabelText('Objective 1') as HTMLInputElement).id).toBe(firstId);
    expect((screen.getByLabelText('Objective 1') as HTMLInputElement).value).toBe('A2');
  });

  it('drops the correct row on removal and shifts the survivors down', () => {
    render(<Harness initial={seed} />);

    fireEvent.click(screen.getByLabelText('Remove objective 2'));

    expect((screen.getByLabelText('Objective 1') as HTMLInputElement).value).toBe('A');
    expect((screen.getByLabelText('Objective 2') as HTMLInputElement).value).toBe('C');
    expect(screen.queryByLabelText('Objective 3')).not.toBeInTheDocument();
  });

  it('preserves the survivor input identity when a preceding row is removed', () => {
    render(<Harness initial={seed} />);

    const lastIdBefore = (screen.getByLabelText('Objective 3') as HTMLInputElement).id;

    fireEvent.click(screen.getByLabelText('Remove objective 1'));

    // "C" is now position 2; with index keys it would have inherited row 2's
    // node, but with stable ids it keeps its own — so the id is unchanged.
    const cInput = screen.getByLabelText('Objective 2') as HTMLInputElement;
    expect(cInput.value).toBe('C');
    expect(cInput.id).toBe(lastIdBefore);
  });

  it('adds a new empty row', () => {
    render(<Harness initial={seed} />);

    fireEvent.click(screen.getByText('Add objective'));

    expect((screen.getByLabelText('Objective 4') as HTMLInputElement).value).toBe('');
  });

  it('shows the empty state when there are no objectives', () => {
    render(<Harness initial={[]} />);
    expect(screen.getByText('No objectives yet. Add at least one.')).toBeInTheDocument();
  });
});

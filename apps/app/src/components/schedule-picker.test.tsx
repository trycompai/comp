import { fireEvent, render, screen } from '@testing-library/react';
import { createContext, useContext, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

interface SelectContextValue {
  value: string;
  onValueChange: (next: string) => void;
  disabled?: boolean;
}

const MockSelectContext = createContext<SelectContextValue | null>(null);

function useMockSelect(): SelectContextValue {
  const ctx = useContext(MockSelectContext);
  if (!ctx) {
    throw new Error('Select components must be used within Select');
  }
  return ctx;
}

vi.mock('@trycompai/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    disabled?: boolean;
    children: ReactNode;
  }) => (
    <MockSelectContext.Provider value={{ value, onValueChange, disabled }}>
      <div>{children}</div>
    </MockSelectContext.Provider>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => {
    const { disabled } = useMockSelect();
    return (
      <button type="button" role="combobox" disabled={disabled}>
        {children}
      </button>
    );
  },
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({
    placeholder,
    children,
  }: {
    placeholder?: string;
    children?: ReactNode;
  }) => {
    const { value } = useMockSelect();
    // Mirror the real Radix behavior: render `children` (the label) when
    // `value` is set, otherwise the placeholder.
    return <span>{value ? (children ?? value) : placeholder}</span>;
  },
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => {
    const { onValueChange } = useMockSelect();
    return (
      <div role="option" onClick={() => onValueChange(value)}>
        {children}
      </div>
    );
  },
}));

// Import AFTER mock is declared so the component uses the mocked Select.
import { SchedulePicker } from './schedule-picker';

describe('SchedulePicker', () => {
  it('renders the current value as a capitalized label', () => {
    render(<SchedulePicker value="weekly" onChange={() => {}} />);
    // The trigger displays the human label (via SelectValue children),
    // not the raw enum.
    expect(screen.getByRole('combobox')).toHaveTextContent('Weekly');
  });

  it('calls onChange when a new option is picked', () => {
    const onChange = vi.fn();
    render(<SchedulePicker value="daily" onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Monthly'));
    expect(onChange).toHaveBeenCalledWith('monthly');
  });

  it('is disabled when disabled prop is true', () => {
    render(<SchedulePicker value="daily" onChange={() => {}} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});

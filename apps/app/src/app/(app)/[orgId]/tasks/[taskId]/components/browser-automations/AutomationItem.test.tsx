import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Base UI menus don't lay out in jsdom, so mirror the repo pattern
// (SecretsTable.test) of replacing the DS dropdown with simple pass-throughs.
// The radio options then render inline and their selection wiring is assertable.
vi.mock('@trycompai/design-system', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const RadioCtx = React.createContext<(value: string) => void>(() => {});
  return {
    Button: ({ children, onClick, render: renderEl, ...props }: any) =>
      renderEl ? (
        // Mirror Base UI trigger composition: `render` supplies the element,
        // children are injected into it.
        <button onClick={onClick} aria-label={renderEl.props['aria-label']}>
          {children}
        </button>
      ) : (
        <button onClick={onClick} aria-label={props['aria-label']}>
          {children}
        </button>
      ),
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children, render: renderEl }: any) => (
      <button aria-label={renderEl?.props?.['aria-label']}>{children}</button>
    ),
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuRadioGroup: ({ children, value, onValueChange }: any) => (
      <RadioCtx.Provider value={onValueChange}>
        <div data-testid="schedule-group" data-value={value}>
          {children}
        </div>
      </RadioCtx.Provider>
    ),
    DropdownMenuRadioItem: ({ children, value }: any) => {
      const onValueChange = React.useContext(RadioCtx);
      return (
        <button role="menuitemradio" onClick={() => onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('@/components/VendorLogo', () => ({
  VendorLogo: () => <span data-testid="vendor-logo" />,
}));
vi.mock('@/components/schedule-summary', () => ({
  ScheduleSummary: () => <span data-testid="schedule-summary" />,
}));
vi.mock('./RunHistory', () => ({
  RunHistory: () => <div data-testid="run-history" />,
}));

import type { BrowserAutomation } from '../../hooks/types';
import { AutomationItem } from './AutomationItem';

function automation(overrides: Partial<BrowserAutomation> = {}): BrowserAutomation {
  return {
    id: 'auto_1',
    name: 'Quarterly access evidence',
    targetUrl: 'https://example.com',
    instruction: 'Take screenshot',
    isEnabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    scheduleFrequency: 'daily',
    ...overrides,
  };
}

const baseProps = {
  automation: automation(),
  isRunning: false,
  isExpanded: false,
  onToggleExpand: vi.fn(),
  onRun: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggleEnabled: vi.fn(),
  onChangeSchedule: vi.fn(),
};

describe('AutomationItem — schedule control', () => {
  it('renders a compact "Change schedule" control next to Edit', () => {
    render(<AutomationItem {...baseProps} />);
    expect(screen.getByLabelText('Change schedule')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit automation')).toBeInTheDocument();
  });

  it('offers every cadence and reflects the current one', () => {
    render(
      <AutomationItem
        {...baseProps}
        automation={automation({ scheduleFrequency: 'weekly' })}
      />,
    );
    ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument(),
    );
    expect(screen.getByTestId('schedule-group')).toHaveAttribute('data-value', 'weekly');
  });

  it('changes the schedule when a new cadence is picked', () => {
    const onChangeSchedule = vi.fn();
    render(<AutomationItem {...baseProps} onChangeSchedule={onChangeSchedule} />);
    fireEvent.click(screen.getByText('Monthly'));
    expect(onChangeSchedule).toHaveBeenCalledWith('monthly');
  });

  it('hides the schedule control in read-only mode', () => {
    render(<AutomationItem {...baseProps} readOnly />);
    expect(screen.queryByLabelText('Change schedule')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit automation')).not.toBeInTheDocument();
  });
});

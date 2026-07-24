import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub the DS Button + DropdownMenu (Edit/Delete live in a ⋯ menu now).
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} aria-label={props['aria-label']}>
      {children}
    </button>
  ),
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <button aria-label={props['aria-label']}>{children}</button>
  ),
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock('@/components/VendorLogo', () => ({
  VendorLogo: () => <span data-testid="vendor-logo" />,
}));
vi.mock('./AutomationMetaLine', () => ({
  AutomationMetaLine: () => <div data-testid="meta-line" />,
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
};

describe('AutomationItem', () => {
  it('renders Run and an actions menu (Edit/Delete) for an editor', () => {
    render(<AutomationItem {...baseProps} />);
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByLabelText('More actions')).toBeInTheDocument();
    expect(screen.getByText('Edit steps')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('keeps the "Run" label while running so the button width does not shift', () => {
    render(<AutomationItem {...baseProps} isRunning />);
    // The running state swaps the play icon for a spinner but keeps the label,
    // so nothing after the button moves (the reported UI shift).
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.queryByText(/running/i)).not.toBeInTheDocument();
  });

  it('hides editor actions in read-only mode', () => {
    render(<AutomationItem {...baseProps} readOnly />);
    expect(screen.queryByText('Run')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('More actions')).not.toBeInTheDocument();
  });
});

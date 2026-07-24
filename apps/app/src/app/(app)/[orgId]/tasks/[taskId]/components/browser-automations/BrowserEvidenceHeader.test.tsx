import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/VendorLogo', () => ({
  VendorLogo: ({ hostname }: { hostname: string }) => (
    <span data-testid="vendor-logo" data-host={hostname} />
  ),
}));
vi.mock('@trycompai/design-system', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, ...props }: any) => (
    <button aria-label={props['aria-label']}>{children}</button>
  ),
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  DropdownMenuRadioGroup: ({ children }: any) => <div>{children}</div>,
  DropdownMenuRadioItem: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span />,
  Calendar: () => <span />,
  ChevronDown: () => <span />,
  OverflowMenuVertical: () => <span />,
}));

import type { BrowserAutomation, BrowserAutomationRun } from '../../hooks/types';
import { BrowserEvidenceHeader } from './BrowserEvidenceHeader';

function run(status: string): BrowserAutomationRun {
  return { id: `r_${status}`, status, createdAt: '2026-07-23T06:02:00Z' };
}

function automation(overrides: Partial<BrowserAutomation> = {}): BrowserAutomation {
  return {
    id: 'auto_1',
    name: 'A',
    targetUrl: 'https://github.com',
    instruction: 'x',
    isEnabled: true,
    createdAt: '2026-07-20T00:00:00Z',
    scheduleFrequency: 'daily',
    ...overrides,
  };
}

const base = {
  currentCadence: 'daily' as const,
  canUpdate: true,
  canCreate: true,
  onSetTaskSchedule: vi.fn(),
  onConnectAnother: vi.fn(),
  onCreate: vi.fn(),
};

describe('BrowserEvidenceHeader', () => {
  it('shows "All passing" when every latest run succeeded', () => {
    render(<BrowserEvidenceHeader {...base} automations={[automation({ runs: [run('completed')] })]} />);
    expect(screen.getByText('All passing')).toBeInTheDocument();
  });

  it('counts failing automations in the health label', () => {
    render(
      <BrowserEvidenceHeader
        {...base}
        automations={[
          automation({ id: 'a', runs: [run('failed')] }),
          automation({ id: 'b', runs: [run('completed')] }),
        ]}
      />,
    );
    expect(screen.getByText('1 failing')).toBeInTheDocument();
  });

  it('reads "Not run yet" before any run', () => {
    render(<BrowserEvidenceHeader {...base} automations={[automation()]} />);
    expect(screen.getByText('Not run yet')).toBeInTheDocument();
  });

  it('shows a logo per distinct vendor', () => {
    render(
      <BrowserEvidenceHeader
        {...base}
        automations={[
          automation({
            steps: [
              { id: 's1', order: 0, targetUrl: 'https://github.com', instruction: 'x' },
              { id: 's2', order: 1, targetUrl: 'https://saucedemo.com', instruction: 'y' },
            ],
          }),
        ]}
      />,
    );
    expect(screen.getAllByTestId('vendor-logo')).toHaveLength(2);
  });

  it('keeps the status strip but drops the actions when read-only', () => {
    render(
      <BrowserEvidenceHeader
        {...base}
        canUpdate={false}
        canCreate={false}
        automations={[automation({ runs: [run('completed')] })]}
      />,
    );
    expect(screen.getByText('All passing')).toBeInTheDocument();
    expect(screen.queryByText('New evidence')).not.toBeInTheDocument();
    expect(screen.queryByText('Connect another vendor')).not.toBeInTheDocument();
  });
});

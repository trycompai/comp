import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MfaInstructions } from '../../hooks/useMfaInstructions';
import { MfaSetupHelp } from './MfaSetupHelp';

vi.mock('../../hooks/useMfaInstructions', () => ({
  useMfaInstructions: vi.fn(),
}));

// Import the mocked hook after the mock is registered.
import { useMfaInstructions } from '../../hooks/useMfaInstructions';

const mockHook = vi.mocked(useMfaInstructions);

type HookReturn = ReturnType<typeof useMfaInstructions>;

const idle: HookReturn = {
  instructions: undefined,
  isLoading: false,
  error: undefined,
  retry: vi.fn(),
};

const withInstructions = (overrides: Partial<MfaInstructions>): HookReturn => ({
  instructions: {
    hostname: 'github.com',
    steps: ['Open Settings', 'Add authenticator app'],
    tips: ['Copy the manual setup key'],
    confident: true,
    grounded: false,
    checkedAt: '2026-07-24T00:00:00.000Z',
    source: 'generated',
    ...overrides,
  },
  isLoading: false,
  error: undefined,
  retry: vi.fn(),
});

const openPanel = () =>
  fireEvent.click(screen.getByRole('button', { name: /how do i find this key/i }));

describe('MfaSetupHelp', () => {
  beforeEach(() => {
    mockHook.mockReset();
    mockHook.mockReturnValue(idle);
  });

  it('names the vendor in the trigger', () => {
    render(<MfaSetupHelp hostname="github.com" />);
    expect(
      screen.getByRole('button', { name: /how do i find this key for github\.com/i }),
    ).toBeInTheDocument();
  });

  it('fetches lazily — disabled until the panel is opened', () => {
    render(<MfaSetupHelp hostname="github.com" />);
    expect(mockHook).toHaveBeenLastCalledWith('github.com', false);

    openPanel();

    expect(mockHook).toHaveBeenLastCalledWith('github.com', true);
  });

  it('renders numbered steps when open', () => {
    mockHook.mockReturnValue(withInstructions({ source: 'generated' }));
    render(<MfaSetupHelp hostname="github.com" />);
    openPanel();

    expect(screen.getByText('Open Settings')).toBeInTheDocument();
    expect(screen.queryByText(/generic steps/i)).not.toBeInTheDocument();
  });

  it('flags fallback steps as generic', () => {
    mockHook.mockReturnValue(withInstructions({ source: 'fallback' }));
    render(<MfaSetupHelp hostname="obscure.example.com" />);
    openPanel();

    expect(screen.getByText(/generic steps/i)).toBeInTheDocument();
  });

  it('shows a trust line with the checked date when grounded', () => {
    mockHook.mockReturnValue(withInstructions({ grounded: true }));
    render(<MfaSetupHelp hostname="github.com" />);
    openPanel();

    expect(screen.getByText(/current help docs/i)).toBeInTheDocument();
    expect(screen.getByText(/Jul 24, 2026/)).toBeInTheDocument();
  });

  it('shows a retry affordance on error', () => {
    mockHook.mockReturnValue({
      instructions: undefined,
      isLoading: false,
      error: new Error('boom'),
      retry: vi.fn(),
    });
    render(<MfaSetupHelp hostname="github.com" />);
    openPanel();

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mockHook.mockReturnValue({
      instructions: undefined,
      isLoading: true,
      error: undefined,
      retry: vi.fn(),
    });
    render(<MfaSetupHelp hostname="github.com" />);
    openPanel();

    expect(screen.getByText(/looking up the steps/i)).toBeInTheDocument();
  });
});

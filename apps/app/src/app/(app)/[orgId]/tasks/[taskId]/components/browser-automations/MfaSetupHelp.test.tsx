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

const idle: HookReturn = { instructions: undefined, isLoading: false, error: undefined };

const withInstructions = (overrides: Partial<MfaInstructions>): HookReturn => ({
  instructions: {
    hostname: 'github.com',
    steps: ['Open Settings', 'Add authenticator app'],
    tips: ['Copy the manual setup key'],
    confident: true,
    grounded: false,
    source: 'generated',
    ...overrides,
  },
  isLoading: false,
  error: undefined,
});

describe('MfaSetupHelp', () => {
  beforeEach(() => {
    mockHook.mockReset();
    mockHook.mockReturnValue(idle);
  });

  it('names the vendor in the summary', () => {
    render(<MfaSetupHelp hostname="github.com" />);
    expect(screen.getByText(/how do i find this key for github\.com/i)).toBeInTheDocument();
  });

  it('fetches lazily — disabled until the panel is opened', () => {
    const { container } = render(<MfaSetupHelp hostname="github.com" />);
    expect(mockHook).toHaveBeenLastCalledWith('github.com', false);

    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    fireEvent(details, new Event('toggle'));

    expect(mockHook).toHaveBeenLastCalledWith('github.com', true);
  });

  it('renders generated steps and tips', () => {
    mockHook.mockReturnValue(withInstructions({ source: 'generated' }));
    render(<MfaSetupHelp hostname="github.com" />);

    expect(screen.getByText('Open Settings')).toBeInTheDocument();
    expect(screen.getByText('Copy the manual setup key')).toBeInTheDocument();
    expect(screen.queryByText(/generic steps/i)).not.toBeInTheDocument();
  });

  it('flags fallback steps as generic', () => {
    mockHook.mockReturnValue(withInstructions({ source: 'fallback' }));
    render(<MfaSetupHelp hostname="obscure.example.com" />);

    expect(screen.getByText(/generic steps/i)).toBeInTheDocument();
  });

  it('shows a trust line when the steps were grounded in current docs', () => {
    mockHook.mockReturnValue(withInstructions({ grounded: true }));
    render(<MfaSetupHelp hostname="github.com" />);

    expect(screen.getByText(/current help docs/i)).toBeInTheDocument();
  });

  it('shows a helpful message on error', () => {
    mockHook.mockReturnValue({
      instructions: undefined,
      isLoading: false,
      error: new Error('boom'),
    });
    render(<MfaSetupHelp hostname="github.com" />);

    expect(screen.getByText(/enter code manually/i)).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    mockHook.mockReturnValue({ instructions: undefined, isLoading: true, error: undefined });
    render(<MfaSetupHelp hostname="github.com" />);

    expect(screen.getByText(/looking up the steps/i)).toBeInTheDocument();
  });
});

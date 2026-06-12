import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setTheme, useThemeMock } = vi.hoisted(() => ({
  setTheme: vi.fn(),
  useThemeMock: vi.fn(),
}));

vi.mock('next-themes', () => ({ useTheme: useThemeMock }));
vi.mock('@trycompai/ui', () => ({
  Button: ({
    children,
    variant: _v,
    size: _s,
    ...props
  }: { variant?: string; size?: string } & React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeMock.mockReturnValue({ resolvedTheme: 'light', setTheme });
  });

  it('switches to dark when currently light', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches to light when currently dark', () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'dark', setTheme });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});

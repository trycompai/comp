import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@trycompai/design-system';
import { Mail } from 'lucide-react';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with left icon', () => {
    render(<Button iconLeft={<Mail data-testid="mail-icon" />}>Send</Button>);
    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
  });

  it('renders with right icon', () => {
    render(<Button iconRight={<Mail data-testid="mail-icon" />}>Send</Button>);
    expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
  });

  it('hides icons when loading', () => {
    render(
      <Button loading iconLeft={<Mail data-testid="mail-icon" />}>
        Loading
      </Button>
    );
    expect(screen.queryByTestId('mail-icon')).not.toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-destructive');
  });

  it('applies size classes', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-9');
  });

  it('applies full width', () => {
    render(<Button width="full">Full Width</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });
});

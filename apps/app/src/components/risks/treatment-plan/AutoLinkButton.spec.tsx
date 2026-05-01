import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AutoLinkButton } from './AutoLinkButton';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

describe('AutoLinkButton', () => {
  it('shows "generate plan" label when description is empty', () => {
    render(
      <AutoLinkButton
        hasDescription={false}
        onAutoLink={vi.fn().mockResolvedValue({ linked: 0 })}
      />,
    );
    expect(screen.getByRole('button', { name: /Auto-link tasks & generate plan/i })).toBeInTheDocument();
  });

  it('shows "refresh plan" label when description is non-empty', () => {
    render(
      <AutoLinkButton
        hasDescription
        onAutoLink={vi.fn().mockResolvedValue({ linked: 0 })}
      />,
    );
    expect(screen.getByRole('button', { name: /Auto-link tasks & refresh plan/i })).toBeInTheDocument();
  });

  it('calls onAutoLink and chains onAfterLink when links found', async () => {
    const onAutoLink = vi.fn().mockResolvedValue({ linked: 3 });
    const onAfterLink = vi.fn().mockResolvedValue(undefined);
    render(
      <AutoLinkButton hasDescription onAutoLink={onAutoLink} onAfterLink={onAfterLink} />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(onAutoLink).toHaveBeenCalled();
      expect(onAfterLink).toHaveBeenCalled();
    });
  });

  it('skips onAfterLink when zero links found', async () => {
    const onAutoLink = vi.fn().mockResolvedValue({ linked: 0 });
    const onAfterLink = vi.fn();
    render(
      <AutoLinkButton hasDescription onAutoLink={onAutoLink} onAfterLink={onAfterLink} />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(onAutoLink).toHaveBeenCalled();
      expect(onAfterLink).not.toHaveBeenCalled();
    });
  });
});

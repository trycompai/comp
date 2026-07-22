import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveActivityBorder } from './LiveActivityBorder';

describe('LiveActivityBorder', () => {
  it('renders a green ring with a breathing glow while the AI is acting', () => {
    const { container } = render(<LiveActivityBorder />);
    const root = container.firstChild as HTMLElement;
    // Static green ring (inline, so it shows even if the keyframe CSS is stale).
    // jsdom normalizes #22c55e -> rgb(34, 197, 94).
    expect(root.innerHTML).toContain('rgb(34, 197, 94)');
    // The breathing glow layer drives the animation.
    expect(root.querySelector('.ai-ring-halo')).not.toBeNull();
  });

  it('is decorative and click-through (so take-over still works)', () => {
    const { container } = render(<LiveActivityBorder />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('pointer-events-none');
    expect(root).toHaveAttribute('aria-hidden');
  });
});

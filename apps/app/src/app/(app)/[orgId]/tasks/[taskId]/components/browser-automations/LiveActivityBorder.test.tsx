import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveActivityBorder } from './LiveActivityBorder';

describe('LiveActivityBorder', () => {
  it('shows the "AI is controlling" pill while the AI is acting', () => {
    const { container } = render(<LiveActivityBorder />);
    const root = container.firstChild as HTMLElement;
    expect(root.textContent).toContain('AI is controlling');
    // Pill only — no glow ring.
    expect(root.querySelector('.ai-ring-halo')).toBeNull();
  });

  it('shows an amber "Your turn" pill on the user’s turn', () => {
    const { container } = render(<LiveActivityBorder state="you" />);
    const root = container.firstChild as HTMLElement;
    expect(root.textContent).toContain('Your turn');
  });

  it('is decorative and click-through (so take-over still works)', () => {
    const { container } = render(<LiveActivityBorder />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('pointer-events-none');
    expect(root).toHaveAttribute('aria-hidden');
  });
});

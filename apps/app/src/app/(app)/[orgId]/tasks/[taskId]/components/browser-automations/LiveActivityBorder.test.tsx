import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveActivityBorder } from './LiveActivityBorder';

describe('LiveActivityBorder', () => {
  it('draws a green inline ring while the AI is acting', () => {
    const { container } = render(<LiveActivityBorder />);
    const el = container.firstChild as HTMLElement;
    // Inline box-shadow (not a global class) so it can't be stripped or go stale.
    expect(el.getAttribute('style')).toContain('#22c55e');
    expect(el.getAttribute('style')?.toLowerCase()).toContain('box-shadow');
    expect(el).toHaveClass('animate-pulse');
  });

  it('never blocks clicks into the live view (so take-over still works)', () => {
    const { container } = render(<LiveActivityBorder />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('pointer-events-none');
    expect(el).toHaveAttribute('aria-hidden');
  });
});

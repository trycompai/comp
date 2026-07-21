import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveActivityBorder } from './LiveActivityBorder';

describe('LiveActivityBorder', () => {
  it('glows in the primary color when the AI is acting', () => {
    const { container } = render(<LiveActivityBorder state="ai" />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('style')).toContain('--activity-color: var(--primary)');
    expect(el).toHaveClass('browser-activity-border');
  });

  it('glows amber when it is the user’s turn', () => {
    const { container } = render(<LiveActivityBorder state="you" />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('style')).toContain('--activity-color: var(--warning)');
  });

  it('never blocks clicks into the live view (so take-over still works)', () => {
    const { container } = render(<LiveActivityBorder state="ai" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('pointer-events-none');
    expect(el).toHaveAttribute('aria-hidden');
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExpandableDescription } from './ExpandableDescription';

const LONG =
  'Develop security and privacy plans for the system that are consistent with the enterprise architecture.';

describe('ExpandableDescription', () => {
  it('renders the description inline with a read-more affordance', () => {
    render(<ExpandableDescription description={LONG} identifier="PL-2" name="System Security" />);
    expect(screen.getByText(LONG)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /read full description/i }),
    ).toBeInTheDocument();
  });

  it('opens a dialog with the full description and an identifier · name heading', () => {
    render(<ExpandableDescription description={LONG} identifier="PL-2" name="System Security" />);
    fireEvent.click(screen.getByRole('button', { name: /read full description/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('PL-2 · System Security')).toBeInTheDocument();
    expect(within(dialog).getByText(LONG)).toBeInTheDocument();
  });

  it('renders an em dash and no button when there is no description', () => {
    render(<ExpandableDescription description={null} identifier="PL-2" name="System Security" />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /read full description/i })).toBeNull();
  });

  it('does not trigger the clickable parent row when expanding', () => {
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <ExpandableDescription description={LONG} identifier="PL-2" name="System Security" />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /read full description/i }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelationalCell } from './RelationalCell';

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: toastMock }));

// The ui package ships untranspiled JSX in dist; the cell only needs Button.
vi.mock('@trycompai/ui', () => ({
  Button: ({
    children,
    variant: _variant,
    size: _size,
    ...props
  }: { variant?: string; size?: string } & React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

function renderCell(props: Partial<Parameters<typeof RelationalCell>[0]> = {}) {
  const onLink = vi.fn(async () => {});
  const onUnlink = vi.fn(async () => {});
  const onLocalUpdate = vi.fn();
  const getAllItems = vi.fn(async () => [{ id: 'item_1', name: 'Item One' }]);
  render(
    <RelationalCell
      items={[]}
      rowId="row-1"
      isNewRow
      getAllItems={getAllItems}
      onLink={onLink}
      onUnlink={onUnlink}
      onLocalUpdate={onLocalUpdate}
      label="Control"
      labelPlural="Controls"
      {...props}
    />,
  );
  return { onLink, onUnlink, onLocalUpdate, getAllItems };
}

describe('RelationalCell on uncommitted rows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks link selection by default', () => {
    renderCell();
    fireEvent.click(screen.getByText('None'));
    expect(screen.getByText('Save row first to link items')).toBeDefined();
    expect(screen.queryByRole('button', { name: /add control/i })).toBeNull();
  });

  it('allows local link selection with allowSelectOnNewRows', async () => {
    const { onLink, onLocalUpdate, getAllItems } = renderCell({
      allowSelectOnNewRows: true,
    });

    fireEvent.click(screen.getByText('None'));
    expect(screen.queryByText('Save row first to link items')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /add control/i }));
    expect(getAllItems).toHaveBeenCalled();

    fireEvent.click(await screen.findByText('Item One'));

    // New rows collect links locally; nothing is persisted until commit.
    expect(onLink).not.toHaveBeenCalled();
    expect(onLocalUpdate).toHaveBeenCalledWith([{ id: 'item_1', name: 'Item One' }]);
    expect(toastMock.success).toHaveBeenCalledWith('Control will be linked when you commit');
  });

  it('keeps immediate linking for already-saved rows', async () => {
    const { onLink, onLocalUpdate } = renderCell({ isNewRow: false });

    fireEvent.click(screen.getByText('None'));
    fireEvent.click(screen.getByRole('button', { name: /add control/i }));
    fireEvent.click(await screen.findByText('Item One'));

    expect(onLink).toHaveBeenCalledWith('row-1', 'item_1');
    // onLocalUpdate runs after the awaited onLink resolves.
    await waitFor(() =>
      expect(onLocalUpdate).toHaveBeenCalledWith([{ id: 'item_1', name: 'Item One' }]),
    );
  });
});

describe('RelationalCell panel placement (FRAME-8)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens downward when there is room below', () => {
    renderCell();
    fireEvent.click(screen.getByText('None'));
    const panel = screen.getByText('Linked Controls').closest('.bg-popover');
    expect(panel?.className).toContain('top-0');
    expect(panel?.className).not.toContain('bottom-0');
  });

  it('flips upward when the cell is near the viewport bottom', () => {
    renderCell();
    const trigger = screen.getByText('None').closest('div') as HTMLDivElement;
    // window.innerHeight is 768 in jsdom; a cell ending at 760 leaves 8px below.
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 760,
      top: 740,
      left: 0,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 740,
      toJSON: () => ({}),
    } as DOMRect);
    fireEvent.click(trigger);
    const panel = screen.getByText('Linked Controls').closest('.bg-popover');
    expect(panel?.className).toContain('bottom-0');
  });
});

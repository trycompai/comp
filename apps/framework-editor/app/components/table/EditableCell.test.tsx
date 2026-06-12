import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditableCell } from './EditableCell';
import { clearEditorSize, saveEditorSize } from './editor-size-storage';

// The ui package ships untranspiled JSX in dist; stub the bits the cell uses.
vi.mock('@trycompai/ui', () => ({
  Button: ({
    children,
    variant: _v,
    ...props
  }: { variant?: string } & React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function setup(props: Partial<Parameters<typeof EditableCell>[0]> = {}) {
  const onUpdate = vi.fn();
  render(
    <EditableCell
      value="The organization shall assign account managers."
      rowId="row-1"
      columnId="description"
      onUpdate={onUpdate}
      {...props}
    />,
  );
  return { onUpdate };
}

describe('EditableCell — non-expandable (default)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders no expand affordance and no dialog', () => {
    setup();
    expect(screen.queryByRole('button', { name: /large editor/i })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('click switches to single-line input and commits on Enter', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByText(/assign account managers/i));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    fireEvent.change(input, { target: { value: 'New value' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('row-1', 'description', 'New value');
  });
});

describe('EditableCell — expandable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEditorSize();
  });

  it('shows an expand affordance', () => {
    setup({ expandable: true });
    expect(screen.getByRole('button', { name: /large editor/i })).toBeTruthy();
  });

  it('right-click opens the multi-line editor with the current value', () => {
    setup({ expandable: true, expandTitle: 'Edit Control Description' });
    fireEvent.contextMenu(screen.getByText(/assign account managers/i));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Edit Control Description')).toBeTruthy();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.value).toBe('The organization shall assign account managers.');
  });

  it('clicking the expand icon opens the editor without entering inline edit', () => {
    setup({ expandable: true });
    fireEvent.click(screen.getByRole('button', { name: /large editor/i }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('Save commits the edited multi-line value', () => {
    const { onUpdate } = setup({ expandable: true });
    fireEvent.contextMenu(screen.getByText(/assign account managers/i));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2\nLine 3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpdate).toHaveBeenCalledWith('row-1', 'description', 'Line 1\nLine 2\nLine 3');
  });

  it('Save is disabled until the value changes', () => {
    setup({ expandable: true });
    fireEvent.contextMenu(screen.getByText(/assign account managers/i));
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'changed' } });
    expect(save.disabled).toBe(false);
  });

  it('Cancel closes without committing', () => {
    const { onUpdate } = setup({ expandable: true });
    fireEvent.contextMenu(screen.getByText(/assign account managers/i));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'discarded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('still supports the quick single-line edit on normal click', () => {
    const { onUpdate } = setup({ expandable: true });
    fireEvent.click(screen.getByText(/assign account managers/i));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    fireEvent.change(input, { target: { value: 'quick edit' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('row-1', 'description', 'quick edit');
  });

  it('does nothing expandable when disabled', () => {
    setup({ expandable: true, disabled: true });
    expect(screen.queryByRole('button', { name: /large editor/i })).toBeNull();
  });

  it('notifies onExpandedChange when the editor opens and on Save', () => {
    const onExpandedChange = vi.fn();
    setup({ expandable: true, onExpandedChange });
    fireEvent.click(screen.getByRole('button', { name: /large editor/i }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });

  it('notifies onExpandedChange(false) on Cancel', () => {
    const onExpandedChange = vi.fn();
    setup({ expandable: true, onExpandedChange });
    fireEvent.contextMenu(screen.getByText(/assign account managers/i));
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(false);
  });

  it('reopens the editor at the persisted size (FRAME-3)', () => {
    saveEditorSize({ width: 900, height: 500 });
    setup({ expandable: true });
    fireEvent.click(screen.getByRole('button', { name: /large editor/i }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.style.width).toBe('900px');
    expect(textarea.style.height).toBe('500px');
  });
});

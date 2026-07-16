import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MultiRoleCombobox } from './MultiRoleCombobox';

// jsdom doesn't implement these APIs that Radix Popover / cmdk rely on.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const ALLOWED = ['admin', 'auditor', 'employee', 'contractor'];

async function openAndGetRoleItem(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox'));
  const item = (await screen.findByText(name)).closest('[cmdk-item]');
  if (!(item instanceof HTMLElement)) {
    throw new Error(`Role item "${name}" not found`);
  }
  return { user, item };
}

describe('MultiRoleCombobox selection', () => {
  it('does not cancel pointerdown on a role item (regression: role not selectable)', async () => {
    // The role items previously had `onPointerDown={(e) => e.preventDefault()}`.
    // Cancelling pointerdown suppresses the browser's native pointer->click
    // sequence that drives cmdk's `onSelect`, so clicking a role did nothing.
    // jsdom fires a synthetic click that bypasses the pointer sequence, so we
    // assert the underlying DOM contract directly: the item must let the
    // pointerdown default action proceed.
    render(
      <MultiRoleCombobox
        selectedRoles={[]}
        onSelectedRolesChange={vi.fn()}
        allowedRoles={ALLOWED}
        placeholder="Select a role"
      />,
    );

    const { item } = await openAndGetRoleItem('Admin');
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    item.dispatchEvent(pointerDown);

    expect(pointerDown.defaultPrevented).toBe(false);
  });

  it('opens the role list as a modal layer so the parent Dialog cannot swallow selections (regression: CS-748)', async () => {
    // This combobox always renders inside a modal Radix Dialog (invite + edit
    // roles). A non-modal Popover portals its content outside that Dialog, so the
    // Dialog's focus/dismiss layer governs the role items and cmdk's onSelect
    // (driven by the item's native click / a focus-dependent Enter) never fires —
    // clicking a role does nothing. jsdom's synthetic click bypasses that
    // pointer/focus path and can't reproduce the failure, so we assert the DOM
    // contract the fix depends on: the Popover must open as a *modal* dismissable
    // layer, which disables outside pointer events (body `pointer-events: none`)
    // and traps focus, taking governance of the items back from the Dialog.
    render(
      <MultiRoleCombobox
        selectedRoles={[]}
        onSelectedRolesChange={vi.fn()}
        allowedRoles={ALLOWED}
        placeholder="Select a role"
      />,
    );

    expect(document.body.style.pointerEvents).toBe('');

    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await screen.findByText('Admin');

    await waitFor(() => {
      expect(document.body.style.pointerEvents).toBe('none');
    });
  });

  it('adds a role to the selection when clicked', async () => {
    const handleChange = vi.fn();
    render(
      <MultiRoleCombobox
        selectedRoles={[]}
        onSelectedRolesChange={handleChange}
        allowedRoles={ALLOWED}
        placeholder="Select a role"
      />,
    );

    const { user, item } = await openAndGetRoleItem('Admin');
    await user.click(item);

    expect(handleChange).toHaveBeenCalledWith(['admin']);
  });
});

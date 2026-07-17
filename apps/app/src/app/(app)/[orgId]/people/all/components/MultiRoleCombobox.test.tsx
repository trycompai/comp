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
const CUSTOM_ROLES = [
  { id: 'orole_1', name: 'Security Reviewer', permissions: { control: ['read'] } },
];

describe('MultiRoleCombobox (CS-748 / CS-755)', () => {
  it('opens as a modal popover so cmdk role items stay interactive inside a modal dialog', async () => {
    // This combobox renders inside the modal "Add User" / "Edit Roles" Radix
    // Dialog. If its Popover is non-modal, the popover portals its cmdk content
    // outside the Dialog while the Dialog's focus/dismiss layer keeps governing
    // it, so CommandItem.onSelect never fires and no role can be selected. That
    // repro is browser-only — jsdom's synthetic click bypasses the pointer/focus
    // layer path, so a click test passes even when the flow is broken (which is
    // why CS-748 shipped a fix that didn't hold and CS-755 reopened it). The
    // fix is a *modal* Popover, and the observable DOM contract of a modal Radix
    // dismissable layer is that it disables outside pointer events on the body.
    const user = userEvent.setup();
    render(
      <MultiRoleCombobox
        selectedRoles={[]}
        onSelectedRolesChange={vi.fn()}
        allowedRoles={ALLOWED}
        customRoles={CUSTOM_ROLES}
        placeholder="Select a role"
      />,
    );

    await user.click(screen.getByRole('combobox'));

    // Only a modal dismissable layer locks the rest of the page. A non-modal
    // popover leaves the body untouched, so this fails before the fix.
    await waitFor(() => {
      expect(document.body.style.pointerEvents).toBe('none');
    });

    // ...and the modal layer re-enables pointer events on its own content, so
    // the role items remain clickable.
    const content = document.querySelector('[data-slot="popover-content"]');
    expect(content).not.toBeNull();
    expect(content).toHaveStyle({ pointerEvents: 'auto' });
  });

  it('selects a built-in role when clicked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiRoleCombobox
        selectedRoles={[]}
        onSelectedRolesChange={handleChange}
        allowedRoles={ALLOWED}
        customRoles={CUSTOM_ROLES}
        placeholder="Select a role"
      />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Admin'));

    expect(handleChange).toHaveBeenCalledWith(['admin']);
  });

  it('selects a custom role when clicked (the customer-reported path)', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiRoleCombobox
        selectedRoles={[]}
        onSelectedRolesChange={handleChange}
        allowedRoles={ALLOWED}
        customRoles={CUSTOM_ROLES}
        placeholder="Select a role"
      />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('Security Reviewer'));

    expect(handleChange).toHaveBeenCalledWith(['Security Reviewer']);
  });
});

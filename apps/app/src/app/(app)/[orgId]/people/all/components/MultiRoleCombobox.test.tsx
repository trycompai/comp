import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRequire } from 'node:module';
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
    // Dialog. A non-modal popover dismisses itself whenever focus lands outside
    // its content, and the Dialog's focus trap yanks focus out the moment the
    // popover autofocuses its search input — in Safari (which never focuses
    // buttons on click) that focus lands on a non-trigger element, so the
    // picker closed the instant it opened. That repro is browser-only — jsdom
    // click tests pass even when the flow is broken (which is why CS-748
    // shipped a fix that didn't hold and CS-755 reopened it). The fix is a
    // *modal* Popover, and the observable DOM contract of a modal Radix
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

  it('popover and dialog share one copy of the Radix layer/focus singleton modules', () => {
    // Root cause of CS-748/CS-755: packages/ui pinned @radix-ui/react-popover
    // to a version whose react-dismissable-layer / react-focus-scope deps
    // differed from react-dialog's, so two copies were installed and bundled.
    // These modules coordinate through module-level singletons (layer stack,
    // focus-scope stack) — with two copies, dialog and popover cannot see each
    // other's layers: Escape closed both, the two focus traps fought, and in
    // Safari the picker dismissed itself on open. `modal` only behaves
    // correctly when both primitives resolve to the SAME module instance, so
    // assert module identity against the installed tree (this fails if a
    // future version bump reintroduces the skew).
    const req = createRequire(import.meta.url);
    const resolveDep = (fromPkg: string, dep: string) =>
      createRequire(req.resolve(fromPkg)).resolve(dep);
    for (const dep of ['@radix-ui/react-dismissable-layer', '@radix-ui/react-focus-scope']) {
      expect(resolveDep('@radix-ui/react-popover', dep)).toBe(
        resolveDep('@radix-ui/react-dialog', dep),
      );
    }
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

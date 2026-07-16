import { render, screen } from '@testing-library/react';
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

describe('MultiRoleCombobox (CS-748)', () => {
  it('forces pointer-events on the popover content so roles stay clickable inside a modal dialog', async () => {
    // This combobox is used inside the modal "Add User" Radix Dialog, which
    // locks `body { pointer-events: none }`. A Radix dismissable-layer version
    // skew (react-dialog -> 1.1.15 vs react-popover -> 1.1.11) puts the two in
    // separate module-level layer contexts, so the portaled popover never
    // re-enables pointer events and its role items inherit `none` — unclickable
    // and unhoverable. The fix forces pointer-events on the content. jsdom can't
    // hit-test, so we assert the fix is present here; the end-to-end click
    // behavior inside the modal is verified in a real browser.
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

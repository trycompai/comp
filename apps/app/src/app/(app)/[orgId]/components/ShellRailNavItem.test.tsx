import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// next/link needs an App Router context that jsdom doesn't provide; render a plain anchor.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import {
  AppShell,
  AppShellBody,
  AppShellRail,
} from '@trycompai/design-system';
import { ShellRailNavItem } from './ShellRailNavItem';

const Icon = () => <svg data-testid="icon" />;

// Regression for CS-773: the far-left product rail tooltips flashed open then vanished
// (~0.1s) on hover. Root cause: ShellRailNavItem passed a label-derived `id` to
// AppShellRailItem, and AppShellRail re-renders the same rail items into the always-mounted
// mobile drawer. That produced two DOM elements sharing one `id`, which the design system
// forwards to the Base UI tooltip trigger — the duplicate trigger id collides in Base UI's
// floating tree and closes the active tooltip. The fix is to not set a hard-coded id.
describe('ShellRailNavItem (CS-773 tooltip flicker)', () => {
  it('does not set a hard-coded, label-derived id on the rail item', () => {
    render(<ShellRailNavItem href="/org/overview" isActive icon={<Icon />} label="Compliance" />);

    const button = document.querySelector('[data-slot="app-shell-rail-item"]');
    expect(button).not.toBeNull();
    // The old bug set id="app-shell-rail-compliance". Any hard-coded id here is duplicated
    // into the mobile drawer copy and breaks the tooltip, so it must be absent.
    expect(button?.getAttribute('id')).not.toBe('app-shell-rail-compliance');
  });

  it('renders the rail with unique element ids across the desktop rail and mobile drawer', () => {
    // AppShellRail mirrors its children into the always-mounted mobile drawer, so each logical
    // item renders twice. With the fix, the design system generates a unique id per instance;
    // with the bug, the two copies would share the same hard-coded id.
    render(
      <AppShell>
        <AppShellBody>
          <AppShellRail>
            <ShellRailNavItem href="/org/overview" isActive icon={<Icon />} label="Compliance" />
            <ShellRailNavItem href="/org/trust" isActive={false} icon={<Icon />} label="Trust" />
            <ShellRailNavItem href="/org/security" isActive={false} icon={<Icon />} label="Security" />
          </AppShellRail>
        </AppShellBody>
      </AppShell>,
    );

    const ids = Array.from(document.querySelectorAll('[data-slot="app-shell-rail-item"]'))
      .map((el) => el.getAttribute('id'))
      .filter((id): id is string => Boolean(id));

    // There must be no duplicate ids among rail item buttons.
    expect(new Set(ids).size).toBe(ids.length);
    // Sanity: the duplicate render means each of the 3 items appears twice.
    expect(document.querySelectorAll('[data-slot="app-shell-rail-item"]').length).toBe(6);
  });
});

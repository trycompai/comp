import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsSidebar } from './SettingsSidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/org-1/settings',
}));

vi.mock('@trycompai/design-system', () => ({
  AppShellNav: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  AppShellNavItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('SettingsSidebar', () => {
  it('places Billing directly after General when visible', () => {
    render(<SettingsSidebar orgId="org-1" showBillingTab={true} showBrowserTab={false} />);

    const links = screen.getAllByRole('link').map((link) => link.textContent);
    expect(links.slice(0, 3)).toEqual(['General', 'Billing', 'Context']);
  });

  it('hides Billing when the billing tab is disabled', () => {
    render(<SettingsSidebar orgId="org-1" showBillingTab={false} showBrowserTab={false} />);

    expect(screen.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument();
  });
});

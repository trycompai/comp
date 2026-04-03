import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@/utils/auth-client', () => ({
  authClient: {
    admin: {
      impersonateUser: vi.fn(),
      stopImpersonating: vi.fn(),
    },
    organization: {
      setActive: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/org_1/admin/organizations/org_2',
}));

import { AdminOrgTabs, type AdminOrgDetail } from './AdminOrgTabs';

const mockOrg: AdminOrgDetail = {
  id: 'org_2',
  name: 'Test Org',
  slug: 'test-org',
  logo: null,
  createdAt: '2026-01-01T00:00:00Z',
  hasAccess: true,
  onboardingCompleted: true,
  website: 'https://test.com',
  members: [
    {
      id: 'mem_1',
      role: 'owner',
      createdAt: '2026-01-01T00:00:00Z',
      user: {
        id: 'usr_1',
        name: 'Test Owner',
        email: 'owner@test.com',
        image: null,
      },
    },
  ],
};

describe('AdminOrgTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tab triggers', () => {
    render(<AdminOrgTabs org={mockOrg} currentOrgId="org_1" />);

    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /findings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /vendors/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /context/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /evidence/i })).toBeInTheDocument();
  });

  it('renders the page header with org name', () => {
    render(<AdminOrgTabs org={mockOrg} currentOrgId="org_1" />);
    expect(screen.getByText('Test Org')).toBeInTheDocument();
  });

  it('shows active badge for active org', () => {
    render(<AdminOrgTabs org={mockOrg} currentOrgId="org_1" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('switches to findings tab on click', () => {
    render(<AdminOrgTabs org={mockOrg} currentOrgId="org_1" />);
    fireEvent.click(screen.getByRole('tab', { name: /findings/i }));
    expect(screen.getByText(/loading findings/i)).toBeInTheDocument();
  });

  it('switches to tasks tab on click', () => {
    render(<AdminOrgTabs org={mockOrg} currentOrgId="org_1" />);
    fireEvent.click(screen.getByRole('tab', { name: /tasks/i }));
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
  });
});

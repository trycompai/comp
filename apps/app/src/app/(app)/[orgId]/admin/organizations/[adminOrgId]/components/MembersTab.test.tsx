import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@/utils/auth-client', () => ({
  authClient: {
    admin: { impersonateUser: vi.fn() },
    organization: { setActive: vi.fn() },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { MembersTab } from './MembersTab';

const mockMembers = [
  {
    id: 'mem_1',
    role: 'owner',
    createdAt: '2026-01-01T00:00:00Z',
    user: {
      id: 'usr_1',
      name: 'Alice Owner',
      email: 'alice@acme.com',
      image: null,
    },
  },
  {
    id: 'mem_2',
    role: 'admin',
    createdAt: '2026-02-01T00:00:00Z',
    user: {
      id: 'usr_2',
      name: 'Bob Admin',
      email: 'bob@acme.com',
      image: null,
    },
  },
];

const mockInvitations = [
  {
    id: 'inv_1',
    email: 'charlie@acme.com',
    role: 'employee',
    status: 'pending',
    expiresAt: '2026-04-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    user: { name: 'Platform Admin', email: 'admin@platform.com' },
  },
];

describe('MembersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders members table', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(
      <MembersTab
        orgId="org_1"
        orgName="Acme Corp"
        members={mockMembers}
      />,
    );

    expect(screen.getByText('Alice Owner')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin')).toBeInTheDocument();
    expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
    expect(screen.getByText(/members \(2\)/i)).toBeInTheDocument();
  });

  it('fetches and renders pending invitations', async () => {
    mockGet.mockResolvedValue({ data: mockInvitations });
    render(
      <MembersTab
        orgId="org_1"
        orgName="Acme Corp"
        members={mockMembers}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('charlie@acme.com')).toBeInTheDocument();
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/v1/admin/organizations/org_1/invitations',
    );
  });

  it('shows empty state when no pending invitations', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(
      <MembersTab
        orgId="org_1"
        orgName="Acme Corp"
        members={mockMembers}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/no pending invitations/i)).toBeInTheDocument();
    });
  });

  it('shows Invite Member button', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(
      <MembersTab
        orgId="org_1"
        orgName="Acme Corp"
        members={mockMembers}
      />,
    );

    expect(
      screen.getByRole('button', { name: /invite member/i }),
    ).toBeInTheDocument();
  });

  it('renders Login As buttons for each member', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(
      <MembersTab
        orgId="org_1"
        orgName="Acme Corp"
        members={mockMembers}
      />,
    );

    const loginButtons = screen.getAllByRole('button', { name: /login as/i });
    expect(loginButtons).toHaveLength(2);
  });

  it('calls correct invitations API endpoint', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(
      <MembersTab
        orgId="org_test"
        orgName="Test Corp"
        members={[]}
      />,
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_test/invitations',
      );
    });
  });

  describe('impersonation confirmation dialog', () => {
    it('does NOT call impersonateUser immediately on Login As click', async () => {
      const { authClient } = await import('@/utils/auth-client');
      mockGet.mockResolvedValue({ data: [] });
      render(
        <MembersTab
          orgId="org_1"
          orgName="Acme Corp"
          members={mockMembers}
        />,
      );

      const loginButtons = screen.getAllByRole('button', { name: /login as/i });
      fireEvent.click(loginButtons[0]);

      expect(authClient.admin.impersonateUser).not.toHaveBeenCalled();
    });

    it('shows confirmation dialog when Login As is clicked', async () => {
      mockGet.mockResolvedValue({ data: [] });
      render(
        <MembersTab
          orgId="org_1"
          orgName="Acme Corp"
          members={mockMembers}
        />,
      );

      const loginButtons = screen.getAllByRole('button', { name: /login as/i });
      fireEvent.click(loginButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/impersonate user/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/you are about to log in as/i),
      ).toBeInTheDocument();
    });

    it('describes security implications in the confirmation dialog', async () => {
      mockGet.mockResolvedValue({ data: [] });
      render(
        <MembersTab
          orgId="org_1"
          orgName="Acme Corp"
          members={mockMembers}
        />,
      );

      const loginButtons = screen.getAllByRole('button', { name: /login as/i });
      fireEvent.click(loginButtons[0]);

      await waitFor(() => {
        expect(
          screen.getByText(/performed under their identity/i),
        ).toBeInTheDocument();
      });
    });

    it('has a Cancel button that closes the dialog', async () => {
      mockGet.mockResolvedValue({ data: [] });
      render(
        <MembersTab
          orgId="org_1"
          orgName="Acme Corp"
          members={mockMembers}
        />,
      );

      const loginButtons = screen.getAllByRole('button', { name: /login as/i });
      fireEvent.click(loginButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/impersonate user/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText(/impersonate user/i)).not.toBeInTheDocument();
      });
    });

    it('calls impersonateUser only after confirming the dialog', async () => {
      const { authClient } = await import('@/utils/auth-client');
      (authClient.admin.impersonateUser as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (authClient.organization.setActive as ReturnType<typeof vi.fn>).mockResolvedValue({});
      mockGet.mockResolvedValue({ data: [] });

      render(
        <MembersTab
          orgId="org_1"
          orgName="Acme Corp"
          members={mockMembers}
        />,
      );

      const loginButtons = screen.getAllByRole('button', { name: /login as/i });
      fireEvent.click(loginButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/impersonate user/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /impersonate$/i }));

      await waitFor(() => {
        expect(authClient.admin.impersonateUser).toHaveBeenCalledWith({
          userId: 'usr_1',
        });
      });
    });
  });
});

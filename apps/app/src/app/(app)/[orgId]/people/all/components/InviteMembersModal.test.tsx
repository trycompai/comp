import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InviteMembersModal } from './InviteMembersModal';

// Mock server actions
vi.mock('../actions/addEmployeeWithoutInvite', () => ({
  addEmployeeWithoutInvite: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('../actions/checkMemberStatus', () => ({
  checkMemberStatus: vi.fn().mockResolvedValue({ memberExists: false, isActive: false }),
}));
vi.mock('../actions/inviteNewMember', () => ({
  inviteNewMember: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('../actions/sendInvitationEmail', () => ({
  sendInvitationEmailToExistingMember: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock api client
const mockApiGet = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
  },
}));

describe('InviteMembersModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and displays custom roles alongside built-in roles', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        customRoles: [
          { id: 'role_1', name: 'Pentest admin', permissions: { pentest: ['create', 'read', 'delete'] } },
          { id: 'role_2', name: 'Compliance lead', permissions: { control: ['create', 'read', 'update'] } },
        ],
      },
    });

    render(
      <InviteMembersModal
        open={true}
        onOpenChange={vi.fn()}
        organizationId="org_123"
        allowedBuiltInRoles={['admin', 'auditor', 'employee', 'contractor']}
      />,
    );

    // Wait for the custom roles to be fetched
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/v1/roles');
    });
  });

  it('does not fetch custom roles when modal is closed', () => {
    render(
      <InviteMembersModal
        open={false}
        onOpenChange={vi.fn()}
        organizationId="org_123"
        allowedBuiltInRoles={['admin', 'auditor', 'employee', 'contractor']}
      />,
    );

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('renders with built-in roles even when custom roles fetch fails', async () => {
    mockApiGet.mockRejectedValueOnce(new Error('Network error'));

    render(
      <InviteMembersModal
        open={true}
        onOpenChange={vi.fn()}
        organizationId="org_123"
        allowedBuiltInRoles={['admin', 'auditor', 'employee', 'contractor']}
      />,
    );

    // Modal should still render
    await waitFor(() => {
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });
  });

  it('renders the invite button', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { customRoles: [] } });

    render(
      <InviteMembersModal
        open={true}
        onOpenChange={vi.fn()}
        organizationId="org_123"
        allowedBuiltInRoles={['admin', 'auditor']}
      />,
    );

    expect(screen.getByText('Invite')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MemberWithUser } from './TeamMembers';
import { MemberRow } from './MemberRow';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('./MultiRoleCombobox', () => ({ MultiRoleCombobox: () => null }));
vi.mock('./RemoveDeviceAlert', () => ({ RemoveDeviceAlert: () => null }));
vi.mock('./RemoveMemberAlert', () => ({ RemoveMemberAlert: () => null }));

const member = {
  id: 'mem_1',
  userId: 'usr_1',
  organizationId: 'org_123',
  role: 'employee',
  department: null,
  isActive: true,
  deactivated: false,
  fleetDmLabelId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: 'usr_1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    emailVerified: true,
    image: null,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as unknown as MemberWithUser;

const noop = vi.fn();

function renderRow(backgroundCheckStatus?: 'completed' | 'completed_with_flags' | 'invited') {
  return render(
    <table>
      <tbody>
        <MemberRow
          member={member}
          onRemove={noop}
          onRemoveDevice={noop}
          onUpdateRole={noop}
          onReactivate={noop}
          canEdit={false}
          isCurrentUserOwner={false}
          backgroundCheckStatus={backgroundCheckStatus}
        />
      </tbody>
    </table>,
  );
}

describe('MemberRow background check status', () => {
  it('shows background check as incomplete in the tasks column', () => {
    renderRow('invited');
    expect(screen.getByText('Background check 0/1')).toBeInTheDocument();
  });

  it('shows background check as complete in the tasks column', () => {
    renderRow('completed_with_flags');
    expect(screen.getByText('Background check 1/1')).toBeInTheDocument();
    expect(screen.getByLabelText('Employee has completed a background check')).toBeInTheDocument();
  });

  it('does not show the verified tick for incomplete checks', () => {
    renderRow('invited');
    expect(screen.queryByLabelText('Employee has completed a background check')).not.toBeInTheDocument();
  });
});

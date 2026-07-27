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

function renderRow({
  backgroundCheckStatus,
  role = 'employee',
}: {
  backgroundCheckStatus?: 'completed' | 'completed_with_flags' | 'invited';
  role?: string;
} = {}) {
  return render(
    <table>
      <tbody>
        <MemberRow
          member={{ ...member, role }}
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
    renderRow({ backgroundCheckStatus: 'invited' });
    expect(screen.getByTestId('requirement-Background')).toHaveTextContent('Missing');
  });

  it('shows background check as complete in the tasks column', () => {
    renderRow({ backgroundCheckStatus: 'completed_with_flags' });
    expect(screen.getByTestId('requirement-Background')).toHaveTextContent('Done');
    expect(screen.getByLabelText('Employee has completed a background check')).toBeInTheDocument();
  });

  it('does not show the verified tick for incomplete checks', () => {
    renderRow({ backgroundCheckStatus: 'invited' });
    expect(screen.queryByLabelText('Employee has completed a background check')).not.toBeInTheDocument();
  });

  it('does not show background check tracking for auditor-only members', () => {
    renderRow({ backgroundCheckStatus: 'invited', role: 'auditor' });
    expect(screen.queryByTestId('requirement-Background')).not.toBeInTheDocument();
  });
});

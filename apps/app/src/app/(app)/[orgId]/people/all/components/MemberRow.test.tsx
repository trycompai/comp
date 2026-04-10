import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberWithUser } from './TeamMembers';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock child components that aren't relevant
vi.mock('./MultiRoleCombobox', () => ({
  MultiRoleCombobox: () => null,
}));
vi.mock('./RemoveDeviceAlert', () => ({
  RemoveDeviceAlert: () => null,
}));
vi.mock('./RemoveMemberAlert', () => ({
  RemoveMemberAlert: () => null,
}));

import { MemberRow } from './MemberRow';

const baseMember = {
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
    banned: false,
    banReason: null,
    banExpires: null,
  },
} as unknown as MemberWithUser;

const noop = vi.fn();

function renderMemberRow(deviceStatus?: 'compliant' | 'non-compliant' | 'not-installed') {
  return render(
    <table>
      <tbody>
        <MemberRow
          member={baseMember}
          onRemove={noop}
          onRemoveDevice={noop}
          onUpdateRole={noop}
          onReactivate={noop}
          canEdit={false}
          isCurrentUserOwner={false}
          deviceStatus={deviceStatus}
        />
      </tbody>
    </table>,
  );
}

describe('MemberRow device status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Not Installed" with red dot when deviceStatus is not-installed', () => {
    renderMemberRow('not-installed');
    expect(screen.getByText('Not Installed')).toBeInTheDocument();
    expect(screen.getByText('Not Installed').className).toContain('text-muted-foreground');
  });

  it('shows "Not Installed" by default when deviceStatus is omitted', () => {
    renderMemberRow();
    expect(screen.getByText('Not Installed')).toBeInTheDocument();
  });

  it('shows "Compliant" with green dot when deviceStatus is compliant', () => {
    renderMemberRow('compliant');
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.getByText('Compliant').className).toContain('text-foreground');
  });

  it('shows "Non-Compliant" with yellow dot when deviceStatus is non-compliant', () => {
    renderMemberRow('non-compliant');
    expect(screen.getByText('Non-Compliant')).toBeInTheDocument();
    expect(screen.getByText('Non-Compliant').className).toContain('text-foreground');
  });

  it('does not show device status for platform admin', () => {
    const adminMember = {
      ...baseMember,
      user: { ...baseMember.user, role: 'admin' as const },
    } as MemberWithUser;

    render(
      <table>
        <tbody>
          <MemberRow
            member={adminMember}
            onRemove={noop}
            onRemoveDevice={noop}
            onUpdateRole={noop}
            onReactivate={noop}
            canEdit={false}
            isCurrentUserOwner={false}
            deviceStatus="compliant"
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Not Installed')).not.toBeInTheDocument();
  });

  it('does not show device status for deactivated member', () => {
    const deactivatedMember = {
      ...baseMember,
      deactivated: true,
    } as MemberWithUser;

    render(
      <table>
        <tbody>
          <MemberRow
            member={deactivatedMember}
            onRemove={noop}
            onRemoveDevice={noop}
            onUpdateRole={noop}
            onReactivate={noop}
            canEdit={false}
            isCurrentUserOwner={false}
            deviceStatus="non-compliant"
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
  });

  it('renders correct dot colors for each status', () => {
    const { container, unmount } = renderMemberRow('compliant');
    const greenDot = container.querySelector('.bg-green-500');
    expect(greenDot).toBeInTheDocument();
    unmount();

    const { container: c2, unmount: u2 } = renderMemberRow('non-compliant');
    const yellowDot = c2.querySelector('.bg-yellow-500');
    expect(yellowDot).toBeInTheDocument();
    u2();

    const { container: c3 } = renderMemberRow('not-installed');
    const redDot = c3.querySelector('.bg-red-400');
    expect(redDot).toBeInTheDocument();
  });
});

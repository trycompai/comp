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

function renderMemberRow(
  deviceStatus?: 'compliant' | 'non-compliant' | 'stale' | 'not-installed',
) {
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

  it('shows "Device 0/1" when deviceStatus is not-installed', () => {
    renderMemberRow('not-installed');
    expect(screen.getByText('Device 0/1')).toBeInTheDocument();
  });

  it('shows dash when deviceStatus is omitted (no compliance obligation)', () => {
    renderMemberRow();
    expect(screen.queryByText(/^Device /)).not.toBeInTheDocument();
  });

  it('shows "Device 1/1" when deviceStatus is compliant', () => {
    renderMemberRow('compliant');
    expect(screen.getByText('Device 1/1')).toBeInTheDocument();
  });

  it('shows "Device 0/1" when deviceStatus is non-compliant', () => {
    renderMemberRow('non-compliant');
    expect(screen.getByText('Device 0/1')).toBeInTheDocument();
  });

  it('shows "Device 0/1" when deviceStatus is stale', () => {
    renderMemberRow('stale');
    expect(screen.getByText('Device 0/1')).toBeInTheDocument();
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

    expect(screen.queryByText(/^Device /)).not.toBeInTheDocument();
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

    expect(screen.queryByText(/^Device /)).not.toBeInTheDocument();
  });

  it('does not show device status for member without compliance obligation (e.g. auditor)', () => {
    const auditorMember = {
      ...baseMember,
      role: 'auditor',
    } as unknown as MemberWithUser;

    render(
      <table>
        <tbody>
          <MemberRow
            member={auditorMember}
            onRemove={noop}
            onRemoveDevice={noop}
            onUpdateRole={noop}
            onReactivate={noop}
            canEdit={false}
            isCurrentUserOwner={false}
            // deviceStatus intentionally omitted — auditor won't be in the map
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByText(/^Device /)).not.toBeInTheDocument();
  });

  it('still shows device status for member with compliance obligation', () => {
    const employeeMember = {
      ...baseMember,
      role: 'employee',
    } as unknown as MemberWithUser;

    render(
      <table>
        <tbody>
          <MemberRow
            member={employeeMember}
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

    expect(screen.getByText('Device 1/1')).toBeInTheDocument();
  });
});

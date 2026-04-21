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

  it('shows "Not Installed" with red dot when deviceStatus is not-installed', () => {
    renderMemberRow('not-installed');
    expect(screen.getByText('Not Installed')).toBeInTheDocument();
    expect(screen.getByText('Not Installed').className).toContain('text-muted-foreground');
  });

  it('shows dash when deviceStatus is omitted (no compliance obligation)', () => {
    renderMemberRow();
    expect(screen.queryByText('Not Installed')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
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

  it('shows "Stale" with gray dot and muted label when deviceStatus is stale', () => {
    const { container } = renderMemberRow('stale');
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('Stale').className).toContain('text-muted-foreground');
    expect(container.querySelector('.bg-gray-400')).toBeInTheDocument();
  });

  it('renders an info tooltip trigger next to the Stale label', () => {
    renderMemberRow('stale');
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('does not render the Stale info tooltip for compliant devices', () => {
    renderMemberRow('compliant');
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the Stale info tooltip for non-compliant devices', () => {
    renderMemberRow('non-compliant');
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the Stale info tooltip for not-installed devices', () => {
    renderMemberRow('not-installed');
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
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

    const { container: c3, unmount: u3 } = renderMemberRow('stale');
    const grayDot = c3.querySelector('.bg-gray-400');
    expect(grayDot).toBeInTheDocument();
    u3();

    const { container: c4 } = renderMemberRow('not-installed');
    const redDot = c4.querySelector('.bg-red-400');
    expect(redDot).toBeInTheDocument();
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

    expect(screen.queryByText('Not Installed')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
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

    expect(screen.getByText('Compliant')).toBeInTheDocument();
  });
});

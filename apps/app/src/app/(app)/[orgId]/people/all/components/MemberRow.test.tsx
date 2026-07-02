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

  it('shows Device as Missing when deviceStatus is not-installed', () => {
    renderMemberRow('not-installed');
    expect(screen.getByTestId('requirement-Device')).toHaveTextContent('Missing');
  });

  it('shows no device row when deviceStatus is omitted (no compliance obligation)', () => {
    renderMemberRow();
    expect(screen.queryByTestId('requirement-Device')).not.toBeInTheDocument();
  });

  it('shows Device as Done when deviceStatus is compliant', () => {
    renderMemberRow('compliant');
    expect(screen.getByTestId('requirement-Device')).toHaveTextContent('Done');
  });

  it('shows Device as Missing when deviceStatus is non-compliant', () => {
    renderMemberRow('non-compliant');
    expect(screen.getByTestId('requirement-Device')).toHaveTextContent('Missing');
  });

  it('shows Device as Missing when deviceStatus is stale', () => {
    renderMemberRow('stale');
    expect(screen.getByTestId('requirement-Device')).toHaveTextContent('Missing');
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

    expect(screen.queryByTestId('requirement-Device')).not.toBeInTheDocument();
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

    expect(screen.queryByTestId('requirement-Device')).not.toBeInTheDocument();
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

    expect(screen.queryByTestId('requirement-Device')).not.toBeInTheDocument();
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

    expect(screen.getByTestId('requirement-Device')).toHaveTextContent('Done');
  });

  it('hides the background-check task counter and verified tick when bypassed', () => {
    render(
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
            backgroundCheckStatus="completed"
            backgroundCheckStepEnabled={false}
            taskCompletion={{
              completed: 1,
              total: 1,
              policies: { completed: 1, total: 1 },
              training: { completed: 0, total: 0 },
            }}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('requirement-Background')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Employee has completed a background check'),
    ).not.toBeInTheDocument();
  });

  it('hides the background-check counter and verified tick for an exempt member', () => {
    render(
      <table>
        <tbody>
          <MemberRow
            {...{
              member: { ...baseMember, backgroundCheckExempt: true },
              onRemove: noop,
              onRemoveDevice: noop,
              onUpdateRole: noop,
              onReactivate: noop,
              canEdit: false,
              isCurrentUserOwner: false,
              backgroundCheckStatus: 'completed' as const,
              backgroundCheckStepEnabled: true,
              taskCompletion: {
                completed: 1,
                total: 1,
                policies: { completed: 1, total: 1 },
                training: { completed: 0, total: 0 },
              },
            }}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('requirement-Background')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Employee has completed a background check'),
    ).not.toBeInTheDocument();
  });

  it('hides the Policies row when there are no required policies (0/0 is not-applicable)', () => {
    render(
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
            taskCompletion={{
              completed: 0,
              total: 0,
              policies: { completed: 0, total: 0 },
              training: { completed: 0, total: 0 },
            }}
          />
        </tbody>
      </table>,
    );

    expect(screen.queryByTestId('requirement-Policies')).not.toBeInTheDocument();
  });
});

describe('MemberRow 2FA status', () => {
  function render2fa({
    member = baseMember,
    twoFactorStatus,
  }: {
    member?: MemberWithUser;
    twoFactorStatus?: 'enabled' | 'missing' | 'not-provided';
  }) {
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
            twoFactorStatus={twoFactorStatus}
          />
        </tbody>
      </table>,
    );
  }

  it('shows no 2FA row when no source is configured (status undefined)', () => {
    render2fa({});
    expect(screen.queryByTestId('requirement-2FA')).not.toBeInTheDocument();
  });

  it.each([
    ['enabled', 'Done'],
    ['missing', 'Missing'],
    ['not-provided', 'Not provided'],
  ] as const)('renders %s as "%s"', (status, text) => {
    render2fa({ twoFactorStatus: status });
    expect(screen.getByTestId('requirement-2FA')).toHaveTextContent(text);
  });

  it('shows the 2FA row even for platform admins (2FA applies to all members)', () => {
    const adminMember = {
      ...baseMember,
      user: { ...baseMember.user, role: 'admin' as const },
    } as MemberWithUser;

    render2fa({ member: adminMember, twoFactorStatus: 'enabled' });
    expect(screen.getByTestId('requirement-2FA')).toHaveTextContent('Done');
  });

  it('hides the 2FA row for deactivated members', () => {
    const deactivatedMember = {
      ...baseMember,
      deactivated: true,
    } as MemberWithUser;

    render2fa({ member: deactivatedMember, twoFactorStatus: 'missing' });
    expect(screen.queryByTestId('requirement-2FA')).not.toBeInTheDocument();
  });
});

import { hasPermission } from '@/lib/permissions';
import { resolveUserPermissions } from '@/lib/permissions.server';
import { auth } from '@/utils/auth';
import { db } from '@db/server';
import type { Metadata } from 'next';
import type { Role } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { TeamMembers } from './all/components/TeamMembers';
import { TeamMembersSkeleton } from './all/components/TeamMembersSkeleton';
import { PeoplePageTabs } from './components/PeoplePageTabs';
import { EmployeesOverview } from './dashboard/components/EmployeesOverview';
import { DevicesTabContent } from './devices/components/DevicesTabContent';
import { OrgChartTabContent } from './org-chart/components/OrgChartTabContent';
import { PeopleSettings } from './settings/components/PeopleSettings';

export default async function PeoplePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.session.activeOrganizationId) {
    return redirect('/');
  }

  // Only the caller's own Member row is needed to decide tab visibility /
  // permissions. The heavier org-wide queries (full membership list,
  // compliance-role filtering) used to live here too, but they blocked the
  // page shell on every tab switch. They've been moved into <TeamMembers>
  // (which is Suspense-wrapped), so switching to Chart / Devices / Org-chart
  // no longer waits on compliance bookkeeping.
  const currentUserMember = await db.member.findFirst({
    where: { organizationId: orgId, userId: session.user.id },
  });
  const currentUserRoles = currentUserMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const isCurrentUserOwner = currentUserRoles.includes('owner');

  const userPermissions = await resolveUserPermissions(
    currentUserMember?.role ?? null,
    orgId,
  );
  const canManageMembers = hasPermission(userPermissions, 'member', 'update');
  const canInviteUsers = hasPermission(userPermissions, 'member', 'create');

  const hasWriteMemberAccess =
    canInviteUsers &&
    hasPermission(userPermissions, 'member', 'read') &&
    canManageMembers &&
    hasPermission(userPermissions, 'member', 'delete');
  const allowedBuiltInRoles: Role[] = hasWriteMemberAccess
    ? ['admin', 'auditor', 'employee', 'contractor']
    : ['employee', 'contractor'];
  const canManageOrgSettings = hasPermission(
    userPermissions,
    'organization',
    'update',
  );

  const organization = canManageOrgSettings
    ? await db.organization.findUnique({
        where: { id: orgId },
        select: { backgroundCheckStepEnabled: true },
      })
    : null;

  return (
    <PeoplePageTabs
      peopleContent={
        <Suspense fallback={<TeamMembersSkeleton />}>
          <TeamMembers
            canManageMembers={canManageMembers}
            canInviteUsers={canInviteUsers}
            isCurrentUserOwner={isCurrentUserOwner}
            organizationId={orgId}
          />
        </Suspense>
      }
      employeeTasksContent={<EmployeesOverview />}
      devicesContent={<DevicesTabContent isCurrentUserOwner={isCurrentUserOwner} />}
      orgChartContent={<OrgChartTabContent organizationId={orgId} />}
      findingsContent={null}
      showRoleMapping={false}
      roleMappingContent={null}
      showSettings={canManageOrgSettings && organization !== null}
      settingsContent={
        canManageOrgSettings && organization ? (
          <PeopleSettings
            backgroundCheckStepEnabled={
              organization.backgroundCheckStepEnabled === true
            }
          />
        ) : null
      }
      showEmployeeTasks
      canInviteUsers={canInviteUsers}
      canManageMembers={canManageMembers}
      allowedBuiltInRoles={allowedBuiltInRoles}
      organizationId={orgId}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'People',
  };
}

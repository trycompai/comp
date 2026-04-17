import { filterComplianceMembers } from '@/lib/compliance';
import { auth } from '@/utils/auth';
import { db } from '@db/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PeopleFindingsUnifiedList } from './all/components/PeopleFindingsUnifiedList';
import { TeamMembers } from './all/components/TeamMembers';
import { PeoplePageTabs } from './components/PeoplePageTabs';
import { EmployeesOverview } from './dashboard/components/EmployeesOverview';
import { DevicesTabContent } from './devices/components/DevicesTabContent';
import { OrgChartTabContent } from './org-chart/components/OrgChartTabContent';

export default async function PeoplePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    return redirect('/');
  }

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session.user.id,
    },
  });
  const currentUserRoles = currentUserMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const canManageMembers = currentUserRoles.some((role) => ['owner', 'admin'].includes(role));
  const isAuditor = currentUserRoles.includes('auditor');
  const canInviteUsers = canManageMembers || isAuditor;
  const isCurrentUserOwner = currentUserRoles.includes('owner');
  const isPlatformAdmin = session.user.role === 'admin';

  // Only fetch what page-level logic needs: the set of members with compliance
  // obligations. Used to (a) decide whether the Tasks tab shows, and (b) tell
  // the People tab which members to include in the device compliance map.
  const complianceMembers = await db.member.findMany({
    where: {
      organizationId: orgId,
      deactivated: false,
      isActive: true,
    },
    include: {
      user: { select: { role: true } },
    },
  });

  const employees = await filterComplianceMembers(complianceMembers, orgId);
  const complianceMemberIds = employees.map((m) => m.id);
  const showEmployeeTasks = employees.length > 0;

  return (
    <PeoplePageTabs
      peopleContent={
        <TeamMembers
          canManageMembers={canManageMembers}
          canInviteUsers={canInviteUsers}
          isCurrentUserOwner={isCurrentUserOwner}
          organizationId={orgId}
          complianceMemberIds={complianceMemberIds}
        />
      }
      employeeTasksContent={showEmployeeTasks ? <EmployeesOverview /> : null}
      devicesContent={<DevicesTabContent isCurrentUserOwner={isCurrentUserOwner} />}
      orgChartContent={<OrgChartTabContent organizationId={orgId} />}
      findingsContent={
        <PeopleFindingsUnifiedList
          isAuditor={isAuditor}
          isPlatformAdmin={isPlatformAdmin}
          isAdminOrOwner={canManageMembers}
          showTasksScope={showEmployeeTasks}
        />
      }
      showRoleMapping={false}
      roleMappingContent={null}
      showEmployeeTasks={showEmployeeTasks}
      canInviteUsers={canInviteUsers}
      canManageMembers={canManageMembers}
      organizationId={orgId}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'People',
  };
}

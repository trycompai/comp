import { auth } from '@/utils/auth';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TeamMembers } from './all/components/TeamMembers';
import { PeoplePageTabs } from './components/PeoplePageTabs';
import { DeviceComplianceChart } from './devices/components/DeviceComplianceChart';
import { EmployeeDevicesList } from './devices/components/EmployeeDevicesList';
import { getAllDevices } from './devices/data';
import type { DeviceWithChecks } from './devices/types';

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

  // Fetch devices data from both Device Agent DB and FleetDM
  let devices: DeviceWithChecks[] = [];
  try {
    devices = await getAllDevices();
  } catch (error) {
    console.error('Error fetching employee devices:', error);
    devices = [];
  }

  return (
    <PeoplePageTabs
      peopleContent={
        <TeamMembers
          canManageMembers={canManageMembers}
          canInviteUsers={canInviteUsers}
          isAuditor={isAuditor}
          isCurrentUserOwner={isCurrentUserOwner}
        />
      }
      devicesContent={
        <div className="space-y-6">
          <DeviceComplianceChart devices={devices} />
          <EmployeeDevicesList devices={devices} />
        </div>
      }
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

import { serverApi } from '@/lib/api-server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TeamMembers } from './all/components/TeamMembers';
import { PeoplePageTabs } from './components/PeoplePageTabs';
import { EmployeesOverview } from './dashboard/components/EmployeesOverview';
import { DeviceComplianceChart } from './devices/components/DeviceComplianceChart';
import { EmployeeDevicesList } from './devices/components/EmployeeDevicesList';
import { getEmployeeDevices } from './devices/data';
import type { Host } from './devices/types';

interface PeopleMember {
  userId: string;
  role: string;
}

interface PeopleApiResponse {
  data: PeopleMember[];
  count: number;
  authenticatedUser?: { id: string; email: string };
}

export default async function PeoplePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  const membersResponse = await serverApi.get<PeopleApiResponse>('/v1/people');

  if (!membersResponse.data) {
    return redirect('/');
  }

  const allMembers = membersResponse.data.data;
  const currentUserId = membersResponse.data.authenticatedUser?.id;
  const currentUserMember = allMembers.find((m) => m.userId === currentUserId);

  const currentUserRoles = currentUserMember?.role?.split(',').map((r) => r.trim()) ?? [];
  const canManageMembers = currentUserRoles.some((role) => ['owner', 'admin'].includes(role));
  const isAuditor = currentUserRoles.includes('auditor');
  const canInviteUsers = canManageMembers || isAuditor;
  const isCurrentUserOwner = currentUserRoles.includes('owner');

  const employees = allMembers.filter((member) => {
    const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
    return roles.includes('employee') || roles.includes('contractor');
  });

  const showEmployeeTasks = employees.length > 0;

  // Fetch devices data
  let devices: Host[] = [];
  try {
    const fetchedDevices = await getEmployeeDevices();
    devices = fetchedDevices || [];
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
      employeeTasksContent={showEmployeeTasks ? <EmployeesOverview /> : null}
      devicesContent={
        <>
          <DeviceComplianceChart devices={devices} />
          <EmployeeDevicesList devices={devices} isCurrentUserOwner={isCurrentUserOwner} />
        </>
      }
      showEmployeeTasks={showEmployeeTasks}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'People',
  };
}

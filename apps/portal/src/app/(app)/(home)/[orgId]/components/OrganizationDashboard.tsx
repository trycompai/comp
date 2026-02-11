import type { Member, Organization, User } from '@db';
import { db } from '@db';
import { NoAccessMessage } from '../../components/NoAccessMessage';
import type { FleetPolicy, Host } from '../types';
import { EmployeeTasksList } from './EmployeeTasksList';

// Define the type for the member prop passed from Overview
interface MemberWithUserOrg extends Member {
  user: User;
  organization: Organization;
}

interface OrganizationDashboardProps {
  organizationId: string;
  member: MemberWithUserOrg;
  fleetPolicies: FleetPolicy[];
  host: Host | null;
}

export async function OrganizationDashboard({
  organizationId,
  member,
  fleetPolicies,
  host,
}: OrganizationDashboardProps) {
  // Fetch policies specific to the selected organization
  const policies = await db.policy.findMany({
    where: {
      organizationId: organizationId,
      isRequiredToSign: true,
      status: 'published',
    },
    include: {
      currentVersion: {
        select: {
          id: true,
          content: true,
          pdfUrl: true,
          version: true,
        },
      },
    },
  });

  // Fetch training video completions specific to the member
  const trainingVideos = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: member.id,
    },
  });

  // Get Org first to verify it exists
  const org = await db.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!org) {
    return <NoAccessMessage />;
  }

  return (
    <EmployeeTasksList
      organizationId={organizationId}
      policies={policies}
      trainingVideos={trainingVideos}
      member={member}
      fleetPolicies={fleetPolicies}
      host={host}
    />
  );
}

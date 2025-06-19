import { db } from '@comp/db';
import type { Member, Organization, User } from '@prisma/client';
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
  member: MemberWithUserOrg; // Pass the full member object for user info etc.
  fleetPolicies: FleetPolicy[];
  host: Host | null;
  isFleetEnabled: boolean;
}

export async function OrganizationDashboard({
  organizationId,
  member,
  fleetPolicies,
  host,
  isFleetEnabled,
}: OrganizationDashboardProps) {
  // Fetch policies specific to the selected organization
  const policies = await db.policy.findMany({
    where: {
      organizationId: organizationId,
      isRequiredToSign: true, // Keep original logic for required policies
    },
  });

  // Fetch training video completions specific to the member
  // Note: The original fetched *all* completions for the member, regardless of org
  // If videos are org-specific, the schema/query might need adjustment
  const trainingVideos = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: member.id,
      // Add organizationId filter if EmployeeTrainingVideoCompletion has it
      // organizationId: organizationId,
    },
    // Include video details if needed by EmployeeTasksList
    // include: { trainingVideo: true }
  });

  // Get Org first to get the label id.
  const org = await db.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!org) {
    return <NoAccessMessage />;
  }

  // Display welcome message and tasks
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        {/* Use organization name if available and needed */}
        <p className="text-muted-foreground text-sm">Organization: {member.organization.name}</p>
        <h1 className="text-2xl font-bold">Welcome back, {member.user.name}</h1>
        <p className="text-sm">
          Please complete the following tasks for {member.organization.name}:
        </p>
      </div>
      <EmployeeTasksList
        policies={policies}
        trainingVideos={trainingVideos}
        member={member} // Pass the member object down
        fleetPolicies={fleetPolicies}
        host={host}
        isFleetEnabled={isFleetEnabled ?? false}
      />
    </div>
  );
}

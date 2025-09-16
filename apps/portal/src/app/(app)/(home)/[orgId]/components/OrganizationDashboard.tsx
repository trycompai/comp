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
  member: MemberWithUserOrg; // Pass the full member object for user info etc.
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
      isRequiredToSign: true, // Keep original logic for required policies
      status: 'published',
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

  console.log('[OrganizationDashboard] Training videos fetched:', {
    memberId: member.id,
    count: trainingVideos.length,
    videos: trainingVideos.map((v) => ({
      videoId: v.videoId,
      completedAt: v.completedAt,
    })),
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

  // Display tasks without welcome message for cleaner UI
  return (
    <EmployeeTasksList
      policies={policies}
      trainingVideos={trainingVideos}
      member={member} // Pass the member object down
      fleetPolicies={fleetPolicies}
      host={host}
    />
  );
}

import type { Device, Member, Organization, User } from '@db';
import { db } from '@db/server';
import { evidenceFormDefinitionList } from '@trycompai/company';
import { NoAccessMessage } from '../../components/NoAccessMessage';
import type { FleetPolicy, Host } from '../types';
import { EmployeeTasksList } from './EmployeeTasksList';
import { sortPoliciesByName } from './policy/sort-policies-by-name';

const portalForms = evidenceFormDefinitionList
  .filter((f) => f.portalAccessible)
  .map(({ type, title, description }) => ({ type, title, description }));

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
  agentDevices: Device[];
}

export async function OrganizationDashboard({
  organizationId,
  member,
  fleetPolicies,
  host,
  agentDevices,
}: OrganizationDashboardProps) {
  // Fetch policies specific to the selected organization
  const policies = sortPoliciesByName(
    await db.policy.findMany({
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
    }),
  );

  // Fetch training video completions specific to the member
  const trainingVideos = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: member.id,
    },
  });

  const [org, hipaaFramework] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
    }),
    db.frameworkInstance.findFirst({
      where: {
        organizationId,
        framework: { name: 'HIPAA' },
      },
      select: { id: true },
    }),
  ]);

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
      agentDevices={agentDevices}
      deviceAgentStepEnabled={org.deviceAgentStepEnabled}
      securityTrainingStepEnabled={org.securityTrainingStepEnabled}
      whistleblowerReportEnabled={org.whistleblowerReportEnabled}
      accessRequestFormEnabled={org.accessRequestFormEnabled}
      hasHipaaFramework={!!hipaaFramework}
      portalForms={portalForms}
    />
  );
}

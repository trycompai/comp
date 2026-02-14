import { auth } from '@/utils/auth';
import { s3Client, BUCKET_NAME } from '@/app/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TeamMembers } from './all/components/TeamMembers';
import { PeoplePageTabs } from './components/PeoplePageTabs';
import { EmployeesOverview } from './dashboard/components/EmployeesOverview';
import { DeviceComplianceChart } from './devices/components/DeviceComplianceChart';
import { EmployeeDevicesList } from './devices/components/EmployeeDevicesList';
import { getAllDevices } from './devices/data';
import type { DeviceWithChecks } from './devices/types';
import { OrgChartContent } from './org-chart/components/OrgChartContent';

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

  // Fetch members with user info (used for both employee check and org chart)
  const membersWithUsers = await db.member.findMany({
    where: {
      organizationId: orgId,
      deactivated: false,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // Check if there are employees to show the Employee Tasks tab
  const employees = membersWithUsers.filter((member) => {
    const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
    return roles.includes('employee') || roles.includes('contractor');
  });

  const showEmployeeTasks = employees.length > 0;

  // Fetch org chart data directly via Prisma
  const orgChart = await db.organizationChart.findUnique({
    where: { organizationId: orgId },
  });

  // Generate a signed URL for uploaded images
  let orgChartData = null;
  if (orgChart) {
    let signedImageUrl: string | null = null;
    if (
      orgChart.type === 'uploaded' &&
      orgChart.uploadedImageUrl &&
      s3Client &&
      BUCKET_NAME
    ) {
      try {
        const cmd = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: orgChart.uploadedImageUrl,
        });
        signedImageUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 900 });
      } catch {
        // Signed URL generation failed; image won't render
      }
    }

    // Sanitize nodes/edges from JSON to ensure valid React Flow structures
    const rawNodes = Array.isArray(orgChart.nodes) ? orgChart.nodes : [];
    const rawEdges = Array.isArray(orgChart.edges) ? orgChart.edges : [];

    const sanitizedNodes = (rawNodes as Record<string, unknown>[])
      .filter((n) => n && typeof n === 'object' && n.id)
      .map((n) => ({
        ...n,
        position: n.position && typeof (n.position as Record<string, unknown>).x === 'number'
          ? n.position
          : { x: 0, y: 0 },
      }));

    const sanitizedEdges = (rawEdges as Record<string, unknown>[])
      .filter((e) => e && typeof e === 'object' && e.source && e.target)
      .map((e, i) => ({
        ...e,
        id: e.id || `edge-${e.source}-${e.target}-${i}`,
      }));

    orgChartData = {
      ...orgChart,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      updatedAt: orgChart.updatedAt.toISOString(),
      signedImageUrl,
    };
  }

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
      employeeTasksContent={showEmployeeTasks ? <EmployeesOverview /> : null}
      devicesContent={
        <div className="space-y-6">
          <DeviceComplianceChart devices={devices} />
          <EmployeeDevicesList devices={devices} />
        </div>
      }
      orgChartContent={
        <OrgChartContent
          chartData={orgChartData as any}
          members={membersWithUsers}
        />
      }
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

import { filterComplianceMembers } from '@/lib/compliance';
import { auth } from '@/utils/auth';
import { s3Client, BUCKET_NAME } from '@/app/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db/server';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { TeamMembers } from './all/components/TeamMembers';
import { getEmployeeSyncConnections } from './all/data/queries';
import { PeoplePageTabs } from './components/PeoplePageTabs';
import { EmployeesOverview } from './dashboard/components/EmployeesOverview';
import { DeviceComplianceChart } from './devices/components/DeviceComplianceChart';
import { DeviceAgentDevicesList } from './devices/components/DeviceAgentDevicesList';
import { EmployeeDevicesList } from './devices/components/EmployeeDevicesList';
import { getEmployeeDevicesFromDB, getFleetHosts } from './devices/data';
import type { DeviceWithChecks } from './devices/types';
import type { Host } from './devices/types';
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
      isActive: true,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Check if there are members with compliance obligations
  const employees = await filterComplianceMembers(membersWithUsers, orgId);

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

  // Fetch devices from both sources independently — one failing shouldn't break the other
  let agentDevices: DeviceWithChecks[] = [];
  let fleetDevices: Host[] = [];

  const [agentResult, fleetResult, employeeSyncData] = await Promise.allSettled([
    getEmployeeDevicesFromDB(),
    getFleetHosts(),
    getEmployeeSyncConnections(orgId),
  ]);

  if (agentResult.status === 'fulfilled') {
    agentDevices = agentResult.value;
  } else {
    console.error('Error fetching device agent devices:', agentResult.reason);
  }

  if (fleetResult.status === 'fulfilled') {
    fleetDevices = fleetResult.value || [];
  } else {
    console.error('Error fetching Fleet devices:', fleetResult.reason);
  }

  const syncConnections = employeeSyncData.status === 'fulfilled'
    ? employeeSyncData.value
    : null;

  // Filter out Fleet hosts for members who already have device-agent devices
  // Device agent takes priority over Fleet
  const memberIdsWithAgent = new Set(
    agentDevices.map((d) => d.memberId).filter(Boolean),
  );
  const filteredFleetDevices = fleetDevices.filter(
    (host) => !host.member_id || !memberIdsWithAgent.has(host.member_id),
  );

  // Build unified device status map from the SAME data both tabs use.
  // This ensures the member list and compliance chart agree on compliance.
  const deviceStatusMap: Record<string, 'compliant' | 'non-compliant' | 'not-installed'> = {};

  // Device-agent devices: compliant only if ALL of a member's devices pass
  const agentComplianceByMember = new Map<string, boolean>();
  for (const d of agentDevices) {
    if (!d.memberId) continue;
    const prev = agentComplianceByMember.get(d.memberId);
    agentComplianceByMember.set(d.memberId, (prev ?? true) && d.isCompliant);
  }
  for (const [memberId, allCompliant] of agentComplianceByMember) {
    deviceStatusMap[memberId] = allCompliant ? 'compliant' : 'non-compliant';
  }

  // Fleet-only devices: use the same merged policy data the chart uses
  // (Fleet API automated checks + DB manual overrides, already combined by getFleetHosts)
  for (const host of filteredFleetDevices) {
    if (!host.member_id) continue;
    // If already set by device-agent, skip (agent takes priority)
    if (agentComplianceByMember.has(host.member_id)) continue;
    const isCompliant = host.policies.every((p) => p.response === 'pass');
    // If multiple fleet devices for same member, non-compliant if ANY device fails
    if (!isCompliant || !deviceStatusMap[host.member_id]) {
      deviceStatusMap[host.member_id] = isCompliant ? 'compliant' : 'non-compliant';
    }
  }

  return (
    <PeoplePageTabs
      peopleContent={
        <TeamMembers
          canManageMembers={canManageMembers}
          canInviteUsers={canInviteUsers}
          isAuditor={isAuditor}
          isCurrentUserOwner={isCurrentUserOwner}
          organizationId={orgId}
          deviceStatusMap={deviceStatusMap}
        />
      }
      employeeTasksContent={showEmployeeTasks ? <EmployeesOverview /> : null}
      devicesContent={
        <div className="space-y-6">
          {/* Unified compliance chart covering both device-agent and fleet devices */}
          <DeviceComplianceChart
            fleetDevices={filteredFleetDevices}
            agentDevices={agentDevices}
          />

          {/* Device Agent devices (new system) */}
          {agentDevices.length > 0 && (
            <DeviceAgentDevicesList devices={agentDevices} />
          )}

          {/* Fleet devices (legacy) — only for members without the newer device agent */}
          {filteredFleetDevices.length > 0 && (
            <EmployeeDevicesList devices={filteredFleetDevices} isCurrentUserOwner={isCurrentUserOwner} />
          )}
        </div>
      }
      orgChartContent={
        <OrgChartContent
          chartData={orgChartData as any}
          members={membersWithUsers}
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

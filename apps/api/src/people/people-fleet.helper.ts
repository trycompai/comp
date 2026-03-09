import { Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { FleetService } from '../lib/fleet.service';

const MDM_POLICY_ID = -9999;
const logger = new Logger('PeopleFleetHelper');

export interface FleetPolicyResult {
  id: number;
  name: string;
  response: string;
  attachments: unknown[];
  query?: string;
  critical?: boolean;
  description?: string;
}

function buildPoliciesWithResults(
  host: Record<string, unknown>,
  results: { fleetPolicyId: number; fleetPolicyResponse: string | null; attachments: unknown }[],
) {
  const platform = (host.platform as string)?.toLowerCase();
  const osVersion = (host.os_version as string)?.toLowerCase();
  const isMacOS =
    platform === 'darwin' ||
    platform === 'macos' ||
    platform === 'osx' ||
    osVersion?.includes('mac');

  const hostPolicies = (host.policies || []) as { id: number; name: string; response: string }[];
  const mdm = host.mdm as { connected_to_fleet?: boolean } | undefined;

  const allPolicies = [
    ...hostPolicies,
    ...(isMacOS && mdm
      ? [{ id: MDM_POLICY_ID, name: 'MDM Enabled', response: mdm.connected_to_fleet ? 'pass' : 'fail' }]
      : []),
  ];

  return allPolicies.map((policy) => {
    const policyResult = results.find((r) => r.fleetPolicyId === policy.id);
    return {
      ...policy,
      response:
        policy.response === 'pass' || policyResult?.fleetPolicyResponse === 'pass'
          ? 'pass'
          : 'fail',
      attachments: policyResult?.attachments || [],
    };
  }) as FleetPolicyResult[];
}

export async function getFleetComplianceForMember(
  fleetService: FleetService,
  memberId: string,
  organizationId: string,
  memberFleetLabelId: number | null,
  memberUserId: string,
) {
  if (!memberFleetLabelId) {
    return { fleetPolicies: [], device: null };
  }

  try {
    const labelHostsData = await fleetService.getHostsByLabel(memberFleetLabelId);
    const firstHost = labelHostsData?.hosts?.[0];

    if (!firstHost) {
      return { fleetPolicies: [], device: null };
    }

    const hostData = await fleetService.getHostById(firstHost.id);
    const host = hostData?.host;

    if (!host) {
      return { fleetPolicies: [], device: null };
    }

    const results = await db.fleetPolicyResult.findMany({
      where: { organizationId, userId: memberUserId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      fleetPolicies: buildPoliciesWithResults(host, results),
      device: host,
    };
  } catch (error) {
    logger.error(
      `Failed to get fleet compliance for member ${memberId}:`,
      error,
    );
    return { fleetPolicies: [], device: null };
  }
}

export async function getAllEmployeeDevices(
  fleetService: FleetService,
  organizationId: string,
) {
  try {
    const employees = await db.member.findMany({
      where: { organizationId, deactivated: false },
      include: { user: true },
    });

    const membersWithLabels = employees.filter((e) => e.fleetDmLabelId);
    if (membersWithLabels.length === 0) return [];

    const labelResponses = await Promise.all(
      membersWithLabels.map(async (employee) => {
        try {
          const data = await fleetService.getHostsByLabel(employee.fleetDmLabelId!);
          return {
            userId: employee.userId,
            userName: employee.user?.name,
            memberId: employee.id,
            hosts: data?.hosts || [],
          };
        } catch {
          return { userId: employee.userId, userName: employee.user?.name, memberId: employee.id, hosts: [] };
        }
      }),
    );

    const hostRequests = labelResponses.flatMap((entry) =>
      (entry.hosts as { id: number }[]).map((host) => ({
        userId: entry.userId,
        memberId: entry.memberId,
        userName: entry.userName,
        hostId: host.id,
      })),
    );

    if (hostRequests.length === 0) return [];

    const devices = await Promise.all(
      hostRequests.map(async ({ hostId }) => {
        try {
          return await fleetService.getHostById(hostId);
        } catch {
          return null;
        }
      }),
    );

    const results = await db.fleetPolicyResult.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return devices
      .map((device, index) => {
        if (!device?.host) return null;
        const host = device.host;
        const req = hostRequests[index];
        const memberResults = results.filter((r) => r.userId === req.userId);

        return {
          ...host,
          user_name: req.userName,
          member_id: req.memberId,
          policies: buildPoliciesWithResults(host, memberResults),
        };
      })
      .filter(Boolean);
  } catch (error) {
    logger.error(
      `Failed to get employee devices for org ${organizationId}:`,
      error,
    );
    return [];
  }
}

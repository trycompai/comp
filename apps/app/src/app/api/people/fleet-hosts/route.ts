import { auth } from '@/utils/auth';
import { getFleetInstance } from '@/lib/fleet';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Host } from '@/app/(app)/[orgId]/people/devices/types';

const MDM_POLICY_ID = -9999;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fleet = await getFleetInstance();

  const employees = await db.member.findMany({
    where: {
      organizationId,
      deactivated: false,
      NOT: { user: { role: 'admin' } },
    },
    include: { user: true },
  });

  const labelIdsResponses = await Promise.all(
    employees
      .filter((employee) => employee.fleetDmLabelId)
      .map(async (employee) => ({
        userId: employee.userId,
        userName: employee.user?.name,
        memberId: employee.id,
        response: await fleet.get(`/labels/${employee.fleetDmLabelId}/hosts`),
      })),
  );

  const hostRequests = labelIdsResponses.flatMap((entry) =>
    entry.response.data.hosts.map((host: { id: number }) => ({
      userId: entry.userId,
      hostId: host.id,
      memberId: entry.memberId,
      userName: entry.userName,
    })),
  );

  const CONCURRENCY_LIMIT = 10;
  const devices: { data: { host: Host } }[] = [];
  for (let i = 0; i < hostRequests.length; i += CONCURRENCY_LIMIT) {
    const batch = hostRequests.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(({ hostId }) => fleet.get(`/hosts/${hostId}`)),
    );
    devices.push(...batchResults);
  }
  const userIds = hostRequests.map(({ userId }) => userId);
  const memberIds = hostRequests.map(({ memberId }) => memberId);
  const userNames = hostRequests.map(({ userName }) => userName);

  const results = await db.fleetPolicyResult.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  const resultIndex = new Map<string, (typeof results)[number]>();
  for (const result of results) {
    const key = `${result.userId}:${result.fleetPolicyId}`;
    if (!resultIndex.has(key)) {
      resultIndex.set(key, result);
    }
  }

  const data: Host[] = devices.map(
    (device: { data: { host: Host } }, index: number) => {
      const host = device.data.host;
      const platform = host.platform?.toLowerCase();
      const osVersion = host.os_version?.toLowerCase();
      const isMacOS =
        platform === 'darwin' ||
        platform === 'macos' ||
        platform === 'osx' ||
        osVersion?.includes('mac');
      return {
        ...host,
        user_name: userNames[index],
        member_id: memberIds[index],
        policies: [
          ...(host.policies || []),
          ...(isMacOS
            ? [
                {
                  id: MDM_POLICY_ID,
                  name: 'MDM Enabled',
                  response: host.mdm?.connected_to_fleet ? 'pass' : 'fail',
                },
              ]
            : []),
        ].map((policy) => {
          const policyResult = resultIndex.get(
            `${userIds[index]}:${policy.id}`,
          );
          return {
            ...policy,
            response:
              policy.response === 'pass' ||
              policyResult?.fleetPolicyResponse === 'pass'
                ? 'pass'
                : 'fail',
            attachments: policyResult?.attachments || [],
          };
        }),
      };
    },
  );

  return NextResponse.json({ data });
}

import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { CheckDetails, DeviceWithChecks } from '@/app/(app)/[orgId]/people/devices/types';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const devices = await db.device.findMany({
    where: {
      organizationId,
      member: {
        deactivated: false,
        NOT: { user: { role: 'admin' } },
      },
    },
    include: {
      member: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { installedAt: 'desc' },
  });

  const data: DeviceWithChecks[] = devices.map((device) => ({
    id: device.id,
    name: device.name,
    hostname: device.hostname,
    platform: device.platform as 'macos' | 'windows' | 'linux',
    osVersion: device.osVersion,
    serialNumber: device.serialNumber,
    hardwareModel: device.hardwareModel,
    isCompliant: device.isCompliant,
    diskEncryptionEnabled: device.diskEncryptionEnabled,
    antivirusEnabled: device.antivirusEnabled,
    passwordPolicySet: device.passwordPolicySet,
    screenLockEnabled: device.screenLockEnabled,
    checkDetails: (device.checkDetails as CheckDetails) ?? null,
    lastCheckIn: device.lastCheckIn?.toISOString() ?? null,
    agentVersion: device.agentVersion,
    installedAt: device.installedAt.toISOString(),
    memberId: device.memberId,
    user: {
      name: device.member.user.name,
      email: device.member.user.email,
    },
    source: 'device_agent' as const,
  }));

  return NextResponse.json({ data });
}

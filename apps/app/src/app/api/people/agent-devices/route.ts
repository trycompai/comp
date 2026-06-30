import { db } from '@db/server';
import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/permissions.server';
import {
  daysSinceCheckIn,
  getDeviceComplianceStatus,
} from '@trycompai/utils/devices';
import type { CheckDetails, DeviceWithChecks } from '@/app/(app)/[orgId]/people/devices/types';

/** Maps the DB `DeviceSource` enum to the frontend source discriminant. */
function mapSource(source: string): DeviceWithChecks['source'] {
  if (source === 'integration') return 'integration';
  if (source === 'fleet') return 'fleet';
  return 'device_agent';
}

export async function GET(req: Request) {
  // Enforce the same RBAC as the People area (route permission 'people' =
  // member:read). The session-only check was insufficient — this route returns
  // org device + integration-provider data and can be called directly by any
  // active-org session, so gate it explicitly.
  const ctx = await requireApiPermission(req, 'member', 'read');
  if (ctx instanceof NextResponse) return ctx;
  const { organizationId } = ctx;

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
      agentSession: { select: { expiresAt: true } },
    },
    orderBy: { installedAt: 'desc' },
  });

  // Resolve provider name/slug for integration-sourced devices in one batched
  // query, so each imported device shows its real provenance (e.g. "Kandji")
  // instead of being mislabeled as an agent device. The DB provider row has no
  // logo, so logoUrl is intentionally left undefined here.
  const connectionIds = Array.from(
    new Set(
      devices
        .filter((d) => d.source === 'integration' && d.integrationConnectionId)
        .map((d) => d.integrationConnectionId as string),
    ),
  );

  const providerByConnectionId = new Map<string, { slug: string; name: string }>();
  if (connectionIds.length > 0) {
    const connections = await db.integrationConnection.findMany({
      where: { id: { in: connectionIds }, organizationId },
      select: {
        id: true,
        provider: { select: { slug: true, name: true } },
      },
    });
    for (const conn of connections) {
      if (conn.provider) {
        providerByConnectionId.set(conn.id, {
          slug: conn.provider.slug,
          name: conn.provider.name,
        });
      }
    }
  }

  // An agent device is always richer than an integration import of the same
  // physical machine (it carries live compliance). The backend already refuses
  // to overwrite an agent serial, but guard the read path too: if a serial is
  // owned by an agent device, drop any integration row that shares it.
  const agentSerials = new Set(
    devices
      .filter((d) => d.source !== 'integration' && d.serialNumber)
      .map((d) => d.serialNumber as string),
  );

  const data: DeviceWithChecks[] = devices
    .filter(
      (device) =>
        !(
          device.source === 'integration' &&
          device.serialNumber &&
          agentSerials.has(device.serialNumber)
        ),
    )
    .map((device) => {
      const source = mapSource(device.source);
      const complianceStatus = getDeviceComplianceStatus({
        isCompliant: device.isCompliant,
        lastCheckIn: device.lastCheckIn,
      });
      const provider =
        source === 'integration' && device.integrationConnectionId
          ? providerByConnectionId.get(device.integrationConnectionId)
          : undefined;
      return {
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
        source,
        ...(provider ? { integrationProvider: provider } : {}),
        complianceStatus,
        daysSinceLastCheckIn: daysSinceCheckIn(device.lastCheckIn),
        hasActiveAgentSession:
          source === 'device_agent' &&
          !!device.agentSession &&
          device.agentSession.expiresAt.getTime() > Date.now(),
      };
    });

  return NextResponse.json({ data });
}

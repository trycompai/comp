import { randomUUID } from 'node:crypto';
import { db } from '@db';
import { RegisterDeviceDto } from './dto/register-device.dto';

interface MemberRef {
  id: string;
}

function buildUpdateData(dto: RegisterDeviceDto) {
  return {
    name: dto.name,
    platform: dto.platform,
    osVersion: dto.osVersion,
    hardwareModel: dto.hardwareModel,
    agentVersion: dto.agentVersion,
    // The endpoint agent is the managing source once it registers a device.
    // When it adopts a row previously created by an integration import (matched
    // here by serial for the same member), re-stamp it as an agent device.
    // Otherwise the row stays source='integration', the People tab skips it
    // (it only rolls up agent devices) and a compliant device reads "Missing"
    // there while still showing in the Device tab.
    source: 'agent' as const,
  };
}

export async function registerWithSerial({
  member,
  dto,
}: {
  member: MemberRef;
  dto: RegisterDeviceDto;
}) {
  const existing = await db.device.findUnique({
    where: {
      serialNumber_organizationId: {
        serialNumber: dto.serialNumber!,
        organizationId: dto.organizationId,
      },
    },
    select: { id: true, memberId: true },
  });

  if (existing && existing.memberId !== member.id) {
    return handleFallbackSerial({ member, dto });
  }

  const updateData = buildUpdateData(dto);

  // The row this machine converges on: its serial match, else a prior
  // serial-less registration for the same physical device. The agent's serial
  // extraction can return undefined on a cold boot (e.g. macOS
  // `system_profiler` cache not yet built) and a real value on a subsequent
  // boot — without this adoption, the second registration creates a duplicate
  // while the first row stays orphaned and never receives another check-in
  // (frozen at its old compliance state).
  const target =
    existing ??
    (await db.device.findFirst({
      where: {
        hostname: dto.hostname,
        memberId: member.id,
        organizationId: dto.organizationId,
        serialNumber: null,
      },
      select: { id: true },
    }));

  const device = target
    ? await db.device.update({
        where: { id: target.id },
        data: {
          ...updateData,
          hostname: dto.hostname,
          serialNumber: dto.serialNumber!,
        },
      })
    : await db.device.create({
        data: {
          ...updateData,
          hostname: dto.hostname,
          serialNumber: dto.serialNumber!,
          memberId: member.id,
          organizationId: dto.organizationId,
        },
      });

  await retireDuplicateAgentRows({ keepId: device.id, member, dto });

  return device;
}

/**
 * Registration converges a machine on a single row, but an org can already hold
 * the duplicate an earlier registration created for it — a serial read that came
 * back empty, or a `fallback:` row minted while the serial was still claimed by
 * another member. Such a row never receives another check-in, so it freezes and
 * turns stale, and the People roll-up (worst-wins across every agent row of a
 * member) then reads "Missing" for a machine the employee's Device tab shows as
 * compliant. Dropping them keeps one machine to one row.
 *
 * Only rows that cannot be a *different* machine go: a serial-less row (we never
 * learned its hardware id) or a fallback row minted for this exact serial. A row
 * carrying some other real serial may be genuinely different hardware that
 * happens to share the hostname, and imported rows belong to their integration,
 * so both are left alone.
 */
async function retireDuplicateAgentRows({
  keepId,
  member,
  dto,
}: {
  keepId: string;
  member: MemberRef;
  dto: RegisterDeviceDto;
}) {
  await db.device.deleteMany({
    where: {
      id: { not: keepId },
      hostname: dto.hostname,
      memberId: member.id,
      organizationId: dto.organizationId,
      source: 'agent',
      OR: [
        { serialNumber: null },
        { serialNumber: { startsWith: `fallback:${dto.serialNumber}:` } },
      ],
    },
  });
}

async function handleFallbackSerial({
  member,
  dto,
}: {
  member: MemberRef;
  dto: RegisterDeviceDto;
}) {
  // The newest row for this hostname+member IS this machine, whatever serial it
  // ended up carrying — a previous `fallback:` serial, or none at all because the
  // serial read failed that time. Scoping this to `fallback:<serial>:` missed
  // those rows and minted a second one for the same machine
  // (see `retireDuplicateAgentRows` for what that costs).
  const fallback = await db.device.findFirst({
    where: {
      hostname: dto.hostname,
      memberId: member.id,
      organizationId: dto.organizationId,
    },
    orderBy: { installedAt: 'desc' },
  });

  const updateData = buildUpdateData(dto);

  if (fallback) {
    const device = await db.device.update({
      where: { id: fallback.id },
      data: updateData,
    });
    await retireDuplicateAgentRows({ keepId: device.id, member, dto });
    return device;
  }

  const fallbackSerial = `fallback:${dto.serialNumber}:${randomUUID()}`;

  return db.device.create({
    data: {
      ...updateData,
      hostname: dto.hostname,
      serialNumber: fallbackSerial,
      memberId: member.id,
      organizationId: dto.organizationId,
    },
  });
}

export async function registerWithoutSerial({
  member,
  dto,
}: {
  member: MemberRef;
  dto: RegisterDeviceDto;
}) {
  // Match the machine on hostname + member regardless of the serial already
  // stored on the row — the mirror of the orphan adoption above. Serial
  // extraction is best-effort, so a device that first registered WITH a serial
  // can re-register without one; scoping this to `serialNumber: null` missed that
  // row and created a second one for the same machine (see
  // `retireDuplicateAgentRows`). The update leaves `serialNumber` untouched so a
  // failed read never wipes a serial we already know.
  const existing = await db.device.findFirst({
    where: {
      hostname: dto.hostname,
      memberId: member.id,
      organizationId: dto.organizationId,
    },
    orderBy: { installedAt: 'desc' },
  });

  const updateData = buildUpdateData(dto);

  if (existing) {
    return db.device.update({
      where: { id: existing.id },
      data: updateData,
    });
  }

  return db.device.create({
    data: {
      ...updateData,
      hostname: dto.hostname,
      serialNumber: null,
      memberId: member.id,
      organizationId: dto.organizationId,
    },
  });
}

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

  if (existing) {
    return db.device.update({
      where: { id: existing.id },
      data: { ...updateData, hostname: dto.hostname },
    });
  }

  // Adopt any prior serial-less registration for the same physical device
  // before creating a new row. The agent's serial extraction can return
  // undefined on a cold boot (e.g. macOS `system_profiler` cache not yet
  // built) and a real value on a subsequent boot — without this, the second
  // registration creates a duplicate while the first row stays orphaned and
  // never receives another check-in (frozen at its old compliance state).
  const orphan = await db.device.findFirst({
    where: {
      hostname: dto.hostname,
      memberId: member.id,
      organizationId: dto.organizationId,
      serialNumber: null,
    },
    select: { id: true },
  });

  if (orphan) {
    return db.device.update({
      where: { id: orphan.id },
      data: {
        ...updateData,
        hostname: dto.hostname,
        serialNumber: dto.serialNumber!,
      },
    });
  }

  return db.device.create({
    data: {
      ...updateData,
      hostname: dto.hostname,
      serialNumber: dto.serialNumber!,
      memberId: member.id,
      organizationId: dto.organizationId,
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
  const fallback = await db.device.findFirst({
    where: {
      hostname: dto.hostname,
      memberId: member.id,
      organizationId: dto.organizationId,
      serialNumber: { startsWith: `fallback:${dto.serialNumber}:` },
    },
  });

  const updateData = buildUpdateData(dto);

  if (fallback) {
    return db.device.update({
      where: { id: fallback.id },
      data: updateData,
    });
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
  const existing = await db.device.findFirst({
    where: {
      hostname: dto.hostname,
      memberId: member.id,
      organizationId: dto.organizationId,
      serialNumber: null,
    },
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

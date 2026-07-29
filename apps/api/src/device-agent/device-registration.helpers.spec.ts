jest.mock('@db', () => ({
  db: {
    device: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { db } from '@db';
import {
  registerWithSerial,
  registerWithoutSerial,
} from './device-registration.helpers';
import type { RegisterDeviceDto } from './dto/register-device.dto';

const mockDb = db as jest.Mocked<typeof db>;

const orgId = 'org_test';
const member = { id: 'mem_test' };

function makeDto(
  overrides: Partial<RegisterDeviceDto> = {},
): RegisterDeviceDto {
  return {
    organizationId: orgId,
    hostname: 'my-laptop.local',
    name: 'My Laptop',
    platform: 'macos',
    osVersion: '15.0',
    serialNumber: 'ABC123',
    hardwareModel: 'MacBookPro18,1',
    agentVersion: '1.0.0',
    ...overrides,
  };
}

describe('registerWithSerial — orphan adoption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adopts an existing serial-less row for the same hostname+member instead of creating a duplicate', async () => {
    // The bug scenario: agent first registered without a serial (e.g. cold-
    // boot `system_profiler` returned empty), creating a row with
    // serialNumber=null. A later registration succeeds in reading the
    // serial. Without adoption, registerWithSerial would create a brand-new
    // row and the old one would stay orphaned.
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue(null);
    (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
      id: 'dev_orphan',
    });
    (mockDb.device.update as jest.Mock).mockResolvedValue({
      id: 'dev_orphan',
    });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    expect(mockDb.device.findFirst).toHaveBeenCalledWith({
      where: {
        hostname: dto.hostname,
        memberId: member.id,
        organizationId: orgId,
        serialNumber: null,
      },
      select: { id: true },
    });
    expect(mockDb.device.update).toHaveBeenCalledWith({
      where: { id: 'dev_orphan' },
      data: expect.objectContaining({
        serialNumber: dto.serialNumber,
        hostname: dto.hostname,
      }),
    });
    expect(mockDb.device.create).not.toHaveBeenCalled();
  });

  it('creates a fresh row when no orphan exists', async () => {
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue(null);
    (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev_new' });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    expect(mockDb.device.update).not.toHaveBeenCalled();
    expect(mockDb.device.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serialNumber: dto.serialNumber,
        memberId: member.id,
        organizationId: orgId,
      }),
    });
  });

  it('updates the existing serial-match row without looking for an orphan', async () => {
    // Plain re-registration of an already-known device — must not trigger
    // the orphan lookup or do anything other than an in-place update.
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
      id: 'dev_existing',
      memberId: member.id,
    });
    (mockDb.device.update as jest.Mock).mockResolvedValue({
      id: 'dev_existing',
    });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    expect(mockDb.device.findFirst).not.toHaveBeenCalled();
    expect(mockDb.device.create).not.toHaveBeenCalled();
    expect(mockDb.device.update).toHaveBeenCalledWith({
      where: { id: 'dev_existing' },
      data: expect.objectContaining({ hostname: dto.hostname }),
    });
  });

  it('only adopts an orphan that belongs to the same member', async () => {
    // Safety: the orphan lookup is scoped by memberId, so another member's
    // serial-less row for the same hostname must not be hijacked.
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue(null);
    (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev_new' });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    const call = (mockDb.device.findFirst as jest.Mock).mock.calls[0]?.[0];
    expect(call?.where.memberId).toBe(member.id);
    expect(call?.where.serialNumber).toBeNull();
  });
});

describe('registerWithSerial — claims agent ownership (CS-770)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-stamps an adopted serial-match row as source="agent" so it is not left stuck as an integration import', async () => {
    // CS-770: a device imported via an integration (source='integration') then
    // adopted by the endpoint agent — matched here by serial for the same
    // member — must be re-stamped source='agent'. Otherwise the People tab
    // skips it (it only rolls up agent devices) and the compliant device reads
    // "Missing" there even though the Device tab still shows it.
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
      id: 'dev_intune',
      memberId: member.id,
    });
    (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev_intune' });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    expect(mockDb.device.update).toHaveBeenCalledWith({
      where: { id: 'dev_intune' },
      data: expect.objectContaining({ source: 'agent' }),
    });
  });
});

describe('registerWithoutSerial — unchanged behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the matching null-serial row when one exists', async () => {
    (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
      id: 'dev_null',
    });
    (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev_null' });

    const dto = makeDto({ serialNumber: undefined });
    await registerWithoutSerial({ member, dto });

    expect(mockDb.device.update).toHaveBeenCalledWith({
      where: { id: 'dev_null' },
      data: expect.any(Object),
    });
    expect(mockDb.device.create).not.toHaveBeenCalled();
  });
});

describe('registerWithoutSerial — adopts the machine row that already has a serial (CS-791)', () => {
  type DeviceRow = {
    id: string;
    hostname: string;
    memberId: string;
    organizationId: string;
    serialNumber: string | null;
  };

  /** Minimal Prisma-like `findFirst` so the `where` clause is what decides. */
  function stubFindFirst(rows: DeviceRow[]) {
    (mockDb.device.findFirst as jest.Mock).mockImplementation(
      ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          rows.find((row) =>
            Object.entries(where).every(
              ([key, value]) =>
                (row[key as keyof DeviceRow] ?? null) === value,
            ),
          ) ?? null,
        ),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the existing hostname+member row instead of creating a duplicate when the serial read fails', async () => {
    // The machine first registered WITH a serial. On a later sign-in the
    // agent's serial extraction returns nothing (system_profiler timing out or
    // blocked right after install), so it registers without one. Creating a
    // second row here moves the agent's check-ins to the duplicate and leaves
    // the original to go stale — People rolls up the stale row and shows
    // "Missing" while the employee Device tab shows the fresh row compliant.
    stubFindFirst([
      {
        id: 'dev_existing',
        hostname: 'my-laptop.local',
        memberId: member.id,
        organizationId: orgId,
        serialNumber: 'ABC123',
      },
    ]);
    (mockDb.device.update as jest.Mock).mockResolvedValue({
      id: 'dev_existing',
    });

    const dto = makeDto({ serialNumber: undefined });
    await registerWithoutSerial({ member, dto });

    expect(mockDb.device.create).not.toHaveBeenCalled();
    expect(mockDb.device.update).toHaveBeenCalledWith({
      where: { id: 'dev_existing' },
      data: expect.objectContaining({ source: 'agent' }),
    });
    // A failed serial read must not wipe the serial already on the row.
    const updateData = (mockDb.device.update as jest.Mock).mock.calls[0]?.[0]
      ?.data as Record<string, unknown>;
    expect(updateData).not.toHaveProperty('serialNumber');
  });

  it('still creates a row when the member has no device for that hostname', async () => {
    stubFindFirst([
      {
        id: 'dev_other_member',
        hostname: 'my-laptop.local',
        memberId: 'mem_other',
        organizationId: orgId,
        serialNumber: 'ABC123',
      },
    ]);
    (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev_new' });

    const dto = makeDto({ serialNumber: undefined });
    await registerWithoutSerial({ member, dto });

    expect(mockDb.device.update).not.toHaveBeenCalled();
    expect(mockDb.device.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hostname: dto.hostname,
        serialNumber: null,
        memberId: member.id,
        organizationId: orgId,
      }),
    });
  });
});

describe('registration retires the duplicate rows an org already holds (CS-791)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.device.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  it('drops the serial-less ghost row when the serialed row re-registers', async () => {
    // The reporting org is already in the duplicated state, so preventing new
    // duplicates is not enough: the serial read succeeds, the serialed row is
    // updated, and the ghost the old code created would never check in again —
    // leaving the stale row the People roll-up reads as "Missing".
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
      id: 'dev_serialed',
      memberId: member.id,
    });
    (mockDb.device.update as jest.Mock).mockResolvedValue({
      id: 'dev_serialed',
    });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    expect(mockDb.device.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'dev_serialed' },
        hostname: dto.hostname,
        memberId: member.id,
        organizationId: orgId,
        source: 'agent',
        OR: [
          { serialNumber: null },
          { serialNumber: { startsWith: `fallback:${dto.serialNumber}:` } },
        ],
      },
    });
  });

  it('also retires after a fresh create, and only rows that cannot be different hardware', async () => {
    // A `fallback:` row can outlive the other member's row that forced it, so
    // the create path needs the same sweep. Scoping still matters: an imported
    // row belongs to its integration, and a row carrying another real serial may
    // be genuinely different hardware sharing the hostname. Neither may go.
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue(null);
    (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
    (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev_new' });

    await registerWithSerial({ member, dto: makeDto() });

    const where = (mockDb.device.deleteMany as jest.Mock).mock.calls[0]?.[0]
      ?.where as Record<string, unknown>;
    expect(where.source).toBe('agent');
    expect(where.OR).toHaveLength(2);
  });

  it('adopts the machine row instead of minting a second fallback row', async () => {
    // The serial belongs to another member, so this machine needs a fallback
    // serial — but it already has a row (its serial read failed earlier). The
    // old lookup only matched `fallback:<serial>:` rows and created another one.
    (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
      id: 'dev_other_member',
      memberId: 'mem_other',
    });
    (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
      id: 'dev_ghost',
      serialNumber: null,
    });
    (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev_ghost' });

    const dto = makeDto();
    await registerWithSerial({ member, dto });

    expect(mockDb.device.findFirst).toHaveBeenCalledWith({
      where: {
        hostname: dto.hostname,
        memberId: member.id,
        organizationId: orgId,
      },
      orderBy: { installedAt: 'desc' },
    });
    expect(mockDb.device.create).not.toHaveBeenCalled();
    expect(mockDb.device.update).toHaveBeenCalledWith({
      where: { id: 'dev_ghost' },
      data: expect.objectContaining({ source: 'agent' }),
    });
  });
});

jest.mock('@db', () => ({
  db: {
    device: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
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

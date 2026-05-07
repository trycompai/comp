import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { FleetService } from '../lib/fleet.service';
import { DevicesService } from './devices.service';

jest.mock('@db', () => ({
  db: {
    organization: { findUnique: jest.fn() },
    member: { findFirst: jest.fn() },
    device: { deleteMany: jest.fn() },
  },
}));

describe('DevicesService', () => {
  let service: DevicesService;

  const mockFleetService = {
    getHostsByLabel: jest.fn(),
    getMultipleHosts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: FleetService, useValue: mockFleetService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    jest.clearAllMocks();
  });

  describe('removeDeviceById', () => {
    it('throws when organization does not exist', async () => {
      (db.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeDeviceById({
          organizationId: 'org_missing',
          deviceId: 'dev_1',
          userId: 'usr_1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when user id is missing', async () => {
      (db.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });

      await expect(
        service.removeDeviceById({
          organizationId: 'org_1',
          deviceId: 'dev_1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when user is not a member of organization', async () => {
      (db.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (db.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.removeDeviceById({
          organizationId: 'org_1',
          deviceId: 'dev_1',
          userId: 'usr_1',
        }),
      ).rejects.toThrow('User is not a member of this organization');
    });

    it('throws when member is not an owner', async () => {
      (db.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (db.member.findFirst as jest.Mock).mockResolvedValue({
        role: 'admin',
      });

      await expect(
        service.removeDeviceById({
          organizationId: 'org_1',
          deviceId: 'dev_1',
          userId: 'usr_1',
        }),
      ).rejects.toThrow('Only organization owners can remove devices');
    });

    it('throws when device does not exist in organization', async () => {
      (db.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (db.member.findFirst as jest.Mock).mockResolvedValue({
        role: 'owner',
      });
      (db.device.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(
        service.removeDeviceById({
          organizationId: 'org_1',
          deviceId: 'dev_missing',
          userId: 'usr_1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes device when caller is owner', async () => {
      (db.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org_1',
      });
      (db.member.findFirst as jest.Mock).mockResolvedValue({
        role: ' employee , owner ',
      });
      (db.device.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.removeDeviceById({
        organizationId: 'org_1',
        deviceId: 'dev_1',
        userId: 'usr_1',
      });

      expect(db.device.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'dev_1',
          organizationId: 'org_1',
        },
      });
    });
  });
});

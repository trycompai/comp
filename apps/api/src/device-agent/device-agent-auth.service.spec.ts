import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DeviceAgentAuthService } from './device-agent-auth.service';

// Mock dependencies
jest.mock('@db', () => ({
  db: {
    member: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    device: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
  Prisma: {
    InputJsonValue: {},
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('./device-agent-kv', () => ({
  deviceAgentRedisClient: {
    set: jest.fn().mockResolvedValue('OK'),
    getdel: jest.fn(),
  },
}));

import { db } from '@db';
import { auth } from '../auth/auth.server';
import { deviceAgentRedisClient } from './device-agent-kv';

const mockDb = db as jest.Mocked<typeof db>;
const mockAuth = auth as jest.Mocked<typeof auth>;
const mockKv = deviceAgentRedisClient as jest.Mocked<typeof deviceAgentRedisClient>;

describe('DeviceAgentAuthService', () => {
  let service: DeviceAgentAuthService;

  beforeEach(() => {
    service = new DeviceAgentAuthService();
    jest.clearAllMocks();
  });

  describe('generateAuthCode', () => {
    it('should generate an auth code and store it in KV', async () => {
      (mockAuth.api.getSession as unknown as jest.Mock).mockResolvedValue({
        user: { id: 'user-1' },
        session: { token: 'raw-session-token' },
      });

      const headers = new Headers();
      headers.set('cookie', 'session=abc');

      const result = await service.generateAuthCode({ headers, state: 'test-state' });

      expect(result.code).toHaveLength(64); // 32 bytes hex
      expect(mockKv.set).toHaveBeenCalledWith(
        expect.stringMatching(/^device-auth:/),
        expect.objectContaining({
          sessionToken: 'raw-session-token',
          userId: 'user-1',
          state: 'test-state',
        }),
        { ex: 120 },
      );
    });

    it('should throw UnauthorizedException if no session', async () => {
      (mockAuth.api.getSession as unknown as jest.Mock).mockResolvedValue(null);

      const headers = new Headers();
      await expect(
        service.generateAuthCode({ headers, state: 'test-state' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('exchangeCode', () => {
    it('should return session token for valid code', async () => {
      (mockKv.getdel as jest.Mock).mockResolvedValue({
        sessionToken: 'session-123',
        userId: 'user-1',
        state: 'state-1',
        createdAt: Date.now(),
      });

      const result = await service.exchangeCode({ code: 'valid-code' });

      expect(result).toEqual({
        session_token: 'session-123',
        user_id: 'user-1',
      });
      expect(mockKv.getdel).toHaveBeenCalledWith('device-auth:valid-code');
    });

    it('should throw UnauthorizedException for invalid/expired code', async () => {
      (mockKv.getdel as jest.Mock).mockResolvedValue(null);

      await expect(
        service.exchangeCode({ code: 'invalid-code' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMyOrganizations', () => {
    it('should return user organizations', async () => {
      (mockDb.member.findMany as jest.Mock).mockResolvedValue([
        {
          organization: { id: 'org-1', name: 'Org One', slug: 'org-one' },
          role: 'admin',
        },
        {
          organization: { id: 'org-2', name: 'Org Two', slug: 'org-two' },
          role: 'employee',
        },
      ]);

      const result = await service.getMyOrganizations({ userId: 'user-1' });

      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0]).toEqual({
        organizationId: 'org-1',
        organizationName: 'Org One',
        organizationSlug: 'org-one',
        role: 'admin',
      });
      expect(mockDb.member.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deactivated: false },
        include: { organization: { select: { id: true, name: true, slug: true } } },
      });
    });
  });

  describe('registerDevice', () => {
    const baseDto = {
      name: 'My Mac',
      hostname: 'macbook.local',
      platform: 'macos' as const,
      osVersion: '14.0',
      organizationId: 'org-1',
    };

    it('should throw ForbiddenException if user is not a member', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registerDevice({ userId: 'user-1', dto: baseDto }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a new device without serial number', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev-1' });

      const result = await service.registerDevice({ userId: 'user-1', dto: baseDto });

      expect(result).toEqual({ deviceId: 'dev-1' });
      expect(mockDb.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          hostname: 'macbook.local',
          memberId: 'member-1',
          organizationId: 'org-1',
          serialNumber: null,
        }),
      });
    });

    it('should create a new device with serial number', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
      (mockDb.device.findUnique as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev-2' });

      const dto = { ...baseDto, serialNumber: 'ABC123' };
      const result = await service.registerDevice({ userId: 'user-1', dto });

      expect(result).toEqual({ deviceId: 'dev-2' });
    });

    it('should update existing device when same member re-registers', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'member-1' });
      (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
        id: 'dev-existing',
        memberId: 'member-1',
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev-existing' });

      const dto = { ...baseDto, serialNumber: 'ABC123' };
      const result = await service.registerDevice({ userId: 'user-1', dto });

      expect(result).toEqual({ deviceId: 'dev-existing' });
      expect(mockDb.device.update).toHaveBeenCalled();
    });

    it('should use fallback serial when serial belongs to different member', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'member-2' });
      (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
        id: 'dev-other',
        memberId: 'member-1',
      });
      // No existing fallback
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({ id: 'dev-fallback' });

      const dto = { ...baseDto, serialNumber: 'GENERIC-SERIAL' };
      const result = await service.registerDevice({ userId: 'user-1', dto });

      expect(result).toEqual({ deviceId: 'dev-fallback' });
      expect(mockDb.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serialNumber: expect.stringMatching(/^fallback:GENERIC-SERIAL:/),
        }),
      });
    });
  });

  describe('checkIn', () => {
    it('should update device compliance fields', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ isCompliant: true });

      const result = await service.checkIn({
        userId: 'user-1',
        dto: {
          deviceId: 'dev-1',
          checks: [
            { checkType: 'disk_encryption', passed: true, checkedAt: new Date().toISOString() },
            { checkType: 'antivirus', passed: true, checkedAt: new Date().toISOString() },
            { checkType: 'password_policy', passed: true, checkedAt: new Date().toISOString() },
            { checkType: 'screen_lock', passed: true, checkedAt: new Date().toISOString() },
          ],
        },
      });

      expect(result.isCompliant).toBe(true);
      expect(result.nextCheckIn).toBeDefined();
      expect(mockDb.device.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({
          diskEncryptionEnabled: true,
          antivirusEnabled: true,
          passwordPolicySet: true,
          screenLockEnabled: true,
          isCompliant: true,
        }),
      });
    });

    it('should throw NotFoundException if device not found', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.checkIn({
          userId: 'user-1',
          dto: {
            deviceId: 'dev-missing',
            checks: [
              { checkType: 'disk_encryption', passed: true, checkedAt: new Date().toISOString() },
            ],
          },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set isCompliant to false when not all checks pass', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ isCompliant: false });

      const result = await service.checkIn({
        userId: 'user-1',
        dto: {
          deviceId: 'dev-1',
          checks: [
            { checkType: 'disk_encryption', passed: true, checkedAt: new Date().toISOString() },
            { checkType: 'antivirus', passed: false, checkedAt: new Date().toISOString() },
          ],
        },
      });

      expect(result.isCompliant).toBe(false);
    });
  });

  describe('getDeviceStatus', () => {
    it('should return all devices when no deviceId specified', async () => {
      const devices = [
        { id: 'dev-1', name: 'Mac 1' },
        { id: 'dev-2', name: 'Mac 2' },
      ];
      (mockDb.device.findMany as jest.Mock).mockResolvedValue(devices);

      const result = await service.getDeviceStatus({ userId: 'user-1' });

      expect(result).toEqual({ devices });
    });

    it('should return a specific device', async () => {
      const device = { id: 'dev-1', name: 'Mac 1' };
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(device);

      const result = await service.getDeviceStatus({
        userId: 'user-1',
        deviceId: 'dev-1',
      });

      expect(result).toEqual({ device });
    });

    it('should throw NotFoundException for missing device', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getDeviceStatus({ userId: 'user-1', deviceId: 'dev-missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

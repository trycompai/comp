import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeviceAgentAuthService } from './device-agent-auth.service';
import { CheckResultDto } from './dto/check-in.dto';

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
    session: {
      delete: jest.fn(),
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

jest.mock('./device-agent-session.helper', () => ({
  createDeviceAgentSession: jest.fn(),
}));

import { db } from '@db';
import { auth } from '../auth/auth.server';
import { deviceAgentRedisClient } from './device-agent-kv';
import { createDeviceAgentSession } from './device-agent-session.helper';

const mockDb = db as jest.Mocked<typeof db>;
const mockAuth = auth as jest.Mocked<typeof auth>;
const mockKv = deviceAgentRedisClient as jest.Mocked<
  typeof deviceAgentRedisClient
>;
const mockCreateDeviceAgentSession =
  createDeviceAgentSession as jest.MockedFunction<
    typeof createDeviceAgentSession
  >;

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
      });

      const headers = new Headers();
      headers.set('cookie', 'session=abc');

      const result = await service.generateAuthCode({
        headers,
        state: 'test-state',
      });

      expect(result.code).toHaveLength(64); // 32 bytes hex
      expect(mockKv.set).toHaveBeenCalledWith(
        expect.stringMatching(/^device-auth:/),
        expect.objectContaining({
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('calls createDeviceAgentSession with stored userId and returns its token', async () => {
      (mockKv.getdel as jest.Mock).mockResolvedValueOnce({
        userId: 'usr_1',
        state: 'state-abc',
        createdAt: Date.now(),
      });
      mockCreateDeviceAgentSession.mockResolvedValueOnce({
        sessionId: 'sess_new',
        token: 'tok_new',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.exchangeCode({ code: 'code-abc' });

      expect(mockKv.getdel).toHaveBeenCalledWith('device-auth:code-abc');
      expect(mockCreateDeviceAgentSession).toHaveBeenCalledWith({
        userId: 'usr_1',
      });
      expect(result).toEqual({
        session_token: 'tok_new',
        user_id: 'usr_1',
      });
    });

    it('throws UnauthorizedException with correct message for invalid/expired code', async () => {
      (mockKv.getdel as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.exchangeCode({ code: 'invalid-code' }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.exchangeCode({ code: 'invalid-code' }),
      ).rejects.toThrow('Invalid or expired authorization code');
    });

    it('propagates rejection from createDeviceAgentSession without swallowing', async () => {
      (mockKv.getdel as jest.Mock).mockResolvedValue({
        userId: 'usr_1',
        state: 'state-xyz',
        createdAt: Date.now(),
      });
      const helperError = new Error('session creation failed');
      mockCreateDeviceAgentSession.mockRejectedValueOnce(helperError);

      await expect(
        service.exchangeCode({ code: 'code-xyz' }),
      ).rejects.toThrow(helperError);
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
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
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
        service.registerDevice({
          userId: 'user-1',
          sessionId: 'ses-1',
          dto: baseDto,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create a new device without serial number', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: null,
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: 'ses-1',
      });

      const result = await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses-1',
        dto: baseDto,
      });

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
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findUnique as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev-2',
        agentSessionId: null,
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev-2',
        agentSessionId: 'ses-1',
      });

      const dto = { ...baseDto, serialNumber: 'ABC123' };
      const result = await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses-1',
        dto,
      });

      expect(result).toEqual({ deviceId: 'dev-2' });
    });

    it('should update existing device when same member re-registers', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
        id: 'dev-existing',
        memberId: 'member-1',
      });
      (mockDb.device.update as jest.Mock)
        .mockResolvedValueOnce({
          id: 'dev-existing',
          agentSessionId: null,
        })
        .mockResolvedValueOnce({
          id: 'dev-existing',
          agentSessionId: 'ses-1',
        });

      const dto = { ...baseDto, serialNumber: 'ABC123' };
      const result = await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses-1',
        dto,
      });

      expect(result).toEqual({ deviceId: 'dev-existing' });
      expect(mockDb.device.update).toHaveBeenCalled();
    });

    it('should use fallback serial when serial belongs to different member', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-2',
      });
      (mockDb.device.findUnique as jest.Mock).mockResolvedValue({
        id: 'dev-other',
        memberId: 'member-1',
      });
      // No existing fallback
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev-fallback',
        agentSessionId: null,
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev-fallback',
        agentSessionId: 'ses-1',
      });

      const dto = { ...baseDto, serialNumber: 'GENERIC-SERIAL' };
      const result = await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses-1',
        dto,
      });

      expect(result).toEqual({ deviceId: 'dev-fallback' });
      expect(mockDb.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serialNumber: expect.stringMatching(/^fallback:GENERIC-SERIAL:/),
        }),
      });
    });
  });

  describe('registerDevice (device-agent session linkage)', () => {
    const baseDto = {
      name: 'My Mac',
      hostname: 'macbook.local',
      platform: 'macos' as const,
      osVersion: '14.0',
      organizationId: 'org-1',
    };

    it('fresh device: links new session and does not delete stale session', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: null,
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_new',
      });

      const result = await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses_new',
        dto: baseDto,
      });

      expect(result).toEqual({ deviceId: 'dev_1' });
      expect(mockDb.device.update).toHaveBeenCalledWith({
        where: { id: 'dev_1' },
        data: { agentSessionId: 'ses_new' },
      });
      expect(mockDb.session.delete).not.toHaveBeenCalled();
    });

    it('reinstall: deletes stale session and links new session', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_stale',
      });
      (mockDb.session.delete as jest.Mock).mockResolvedValue({ id: 'ses_stale' });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_new',
      });

      await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses_new',
        dto: baseDto,
      });

      expect(mockDb.session.delete).toHaveBeenCalledWith({
        where: { id: 'ses_stale' },
      });
      expect(mockDb.device.update).toHaveBeenCalledWith({
        where: { id: 'dev_1' },
        data: { agentSessionId: 'ses_new' },
      });
    });

    it('same-session re-registration: does not delete the session when the device is already linked to the same session', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_same',
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_same',
      });

      await service.registerDevice({
        userId: 'user-1',
        sessionId: 'ses_same',
        dto: baseDto,
      });

      expect(mockDb.session.delete).not.toHaveBeenCalled();
      expect(mockDb.device.update).toHaveBeenCalledWith({
        where: { id: 'dev_1' },
        data: { agentSessionId: 'ses_same' },
      });
    });

    it('idempotent reinstall: swallows P2025 when stale session already gone', async () => {
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-1',
      });
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);
      (mockDb.device.create as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_stale',
      });
      const p2025Error = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      });
      (mockDb.session.delete as jest.Mock).mockRejectedValue(p2025Error);
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_new',
      });

      await expect(
        service.registerDevice({
          userId: 'user-1',
          sessionId: 'ses_new',
          dto: baseDto,
        }),
      ).resolves.toEqual({ deviceId: 'dev_1' });

      expect(mockDb.device.update).toHaveBeenCalledWith({
        where: { id: 'dev_1' },
        data: { agentSessionId: 'ses_new' },
      });
    });
  });

  describe('checkIn', () => {
    it('should update device compliance fields', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: 'ses-1',
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        isCompliant: true,
      });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses-1',
        sessionDeviceAgent: true,
        dto: {
          deviceId: 'dev-1',
          checks: [
            {
              checkType: 'disk_encryption',
              passed: true,
              checkedAt: new Date().toISOString(),
            },
            {
              checkType: 'antivirus',
              passed: true,
              checkedAt: new Date().toISOString(),
            },
            {
              checkType: 'password_policy',
              passed: true,
              checkedAt: new Date().toISOString(),
            },
            {
              checkType: 'screen_lock',
              passed: true,
              checkedAt: new Date().toISOString(),
            },
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
          sessionId: 'ses-1',
          sessionDeviceAgent: true,
          dto: {
            deviceId: 'dev-missing',
            checks: [
              {
                checkType: 'disk_encryption',
                passed: true,
                checkedAt: new Date().toISOString(),
              },
            ],
          },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set isCompliant to false when not all checks pass', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: 'ses-1',
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({
        isCompliant: false,
      });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses-1',
        sessionDeviceAgent: true,
        dto: {
          deviceId: 'dev-1',
          checks: [
            {
              checkType: 'disk_encryption',
              passed: true,
              checkedAt: new Date().toISOString(),
            },
            {
              checkType: 'antivirus',
              passed: false,
              checkedAt: new Date().toISOString(),
            },
          ],
        },
      });

      expect(result.isCompliant).toBe(false);
    });
  });

  describe('checkIn (silent upgrade)', () => {
    const baseChecks: CheckResultDto[] = [
      {
        checkType: 'disk_encryption',
        passed: true,
        checkedAt: new Date().toISOString(),
      },
      {
        checkType: 'antivirus',
        passed: true,
        checkedAt: new Date().toISOString(),
      },
      {
        checkType: 'password_policy',
        passed: true,
        checkedAt: new Date().toISOString(),
      },
      {
        checkType: 'screen_lock',
        passed: true,
        checkedAt: new Date().toISOString(),
      },
    ];

    it('fresh device (agentSessionId: null) → upgrade fires, delete NOT called, token returned', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: null,
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev-1' });
      mockCreateDeviceAgentSession.mockResolvedValueOnce({
        sessionId: 'ses_new',
        token: 'tok_new',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses_old_web',
        sessionDeviceAgent: false,
        dto: { deviceId: 'dev-1', checks: baseChecks },
      });

      expect(result.upgradedSessionToken).toBe('tok_new');
      expect(mockCreateDeviceAgentSession).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(mockDb.session.delete).not.toHaveBeenCalled();
      expect(mockDb.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.objectContaining({ agentSessionId: 'ses_new' }),
        }),
      );
    });

    it('device with stale link → stale session deleted, new session minted, agentSessionId updated', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: 'ses_stale',
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.session.delete as jest.Mock).mockResolvedValue({ id: 'ses_stale' });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev-1' });
      mockCreateDeviceAgentSession.mockResolvedValueOnce({
        sessionId: 'ses_new',
        token: 'tok_new',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses_old_web',
        sessionDeviceAgent: false,
        dto: { deviceId: 'dev-1', checks: baseChecks },
      });

      expect(mockDb.session.delete).toHaveBeenCalledWith({
        where: { id: 'ses_stale' },
      });
      expect(result.upgradedSessionToken).toBe('tok_new');
      expect(mockCreateDeviceAgentSession).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(mockDb.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.objectContaining({ agentSessionId: 'ses_new' }),
        }),
      );
    });

    it('stale delete throws P2025 → method still resolves, new session still minted', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: 'ses_stale',
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      const p2025Error = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      });
      (mockDb.session.delete as jest.Mock).mockRejectedValueOnce(p2025Error);
      (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev-1' });
      mockCreateDeviceAgentSession.mockResolvedValueOnce({
        sessionId: 'ses_new',
        token: 'tok_new',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses_old_web',
        sessionDeviceAgent: false,
        dto: { deviceId: 'dev-1', checks: baseChecks },
      });

      expect(result.upgradedSessionToken).toBe('tok_new');
      expect(mockCreateDeviceAgentSession).toHaveBeenCalledWith({
        userId: 'user-1',
      });
      expect(mockDb.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.objectContaining({ agentSessionId: 'ses_new' }),
        }),
      );
    });

    it('device-agent session already linked → no upgrade, no extra update', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: 'ses_new',
        diskEncryptionEnabled: true,
        antivirusEnabled: true,
        passwordPolicySet: true,
        screenLockEnabled: true,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev-1' });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses_new',
        sessionDeviceAgent: true,
        dto: { deviceId: 'dev-1', checks: baseChecks },
      });

      expect(result.upgradedSessionToken).toBeUndefined();
      expect(mockCreateDeviceAgentSession).not.toHaveBeenCalled();
      expect(mockDb.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.not.objectContaining({ agentSessionId: expect.anything() }),
        }),
      );
    });

    it('device-agent session, device not yet linked → backfill agentSessionId', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev-1',
        agentSessionId: null,
        diskEncryptionEnabled: false,
        antivirusEnabled: false,
        passwordPolicySet: false,
        screenLockEnabled: false,
        checkDetails: {},
      });
      (mockDb.device.update as jest.Mock).mockResolvedValue({ id: 'dev-1' });

      const result = await service.checkIn({
        userId: 'user-1',
        sessionId: 'ses_new',
        sessionDeviceAgent: true,
        dto: { deviceId: 'dev-1', checks: baseChecks },
      });

      expect(result.upgradedSessionToken).toBeUndefined();
      expect(mockCreateDeviceAgentSession).not.toHaveBeenCalled();
      expect(mockDb.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev-1' },
          data: expect.objectContaining({ agentSessionId: 'ses_new' }),
        }),
      );
    });
  });

  describe('revokeAgentAccess', () => {
    it('happy path: deletes session for device in org', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_new',
      });
      (mockDb.session.delete as jest.Mock).mockResolvedValue({ id: 'ses_new' });

      await expect(
        service.revokeAgentAccess({ organizationId: 'org_1', deviceId: 'dev_1' }),
      ).resolves.toBeUndefined();

      expect(mockDb.device.findFirst).toHaveBeenCalledWith({
        where: { id: 'dev_1', organizationId: 'org_1' },
        select: { id: true, agentSessionId: true },
      });
      expect(mockDb.session.delete).toHaveBeenCalledWith({
        where: { id: 'ses_new' },
      });
    });

    it('idempotent: resolves without calling session.delete when agentSessionId is null', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: null,
      });

      await expect(
        service.revokeAgentAccess({ organizationId: 'org_1', deviceId: 'dev_1' }),
      ).resolves.toBeUndefined();

      expect(mockDb.session.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when device not found in org', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.revokeAgentAccess({ organizationId: 'org_1', deviceId: 'dev_missing' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.revokeAgentAccess({ organizationId: 'org_1', deviceId: 'dev_missing' }),
      ).rejects.toThrow('Device not found');
    });

    it('P2025 race: swallows error when session already deleted', async () => {
      (mockDb.device.findFirst as jest.Mock).mockResolvedValue({
        id: 'dev_1',
        agentSessionId: 'ses_gone',
      });
      const p2025Error = Object.assign(new Error('Record not found'), {
        code: 'P2025',
      });
      (mockDb.session.delete as jest.Mock).mockRejectedValue(p2025Error);

      await expect(
        service.revokeAgentAccess({ organizationId: 'org_1', deviceId: 'dev_1' }),
      ).resolves.toBeUndefined();
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

import { Prisma } from '@prisma/client';
import type { SyncDevice } from '@trycompai/integration-platform';

const mockMemberFindFirst = jest.fn();
const mockDeviceFindFirst = jest.fn();
const mockDeviceCreate = jest.fn();
const mockDeviceUpdate = jest.fn();
const mockDeviceDeleteMany = jest.fn();
const mockDeviceFindMany = jest.fn();

jest.mock('@db', () => ({
  db: {
    member: {
      findFirst: (...args: unknown[]) => mockMemberFindFirst(...args),
    },
    device: {
      findFirst: (...args: unknown[]) => mockDeviceFindFirst(...args),
      create: (...args: unknown[]) => mockDeviceCreate(...args),
      update: (...args: unknown[]) => mockDeviceUpdate(...args),
      deleteMany: (...args: unknown[]) => mockDeviceDeleteMany(...args),
      findMany: (...args: unknown[]) => mockDeviceFindMany(...args),
    },
  },
}));

import { GenericDeviceSyncService } from './generic-device-sync.service';

describe('GenericDeviceSyncService', () => {
  let service: GenericDeviceSyncService;

  const ORG_ID = 'org_1';
  const CONN_ID = 'conn_1';

  const baseDevice = (
    overrides: Partial<SyncDevice> = {},
  ): SyncDevice => ({
    name: 'Test MacBook',
    platform: 'macos',
    serialNumber: 'SN-001',
    userEmail: 'alice@example.com',
    status: 'active',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GenericDeviceSyncService();

    // Defaults: member exists, no existing device, Phase 2 returns empty.
    mockMemberFindFirst.mockResolvedValue({
      id: 'mem_1',
      organizationId: ORG_ID,
    });
    mockDeviceFindFirst.mockResolvedValue(null);
    mockDeviceCreate.mockResolvedValue({ id: 'dev_1' });
    mockDeviceUpdate.mockResolvedValue({ id: 'dev_1' });
    mockDeviceFindMany.mockResolvedValue([]);
    mockDeviceDeleteMany.mockResolvedValue({ count: 0 });
  });

  // ========================================================================
  // Phase 1 — Import
  // ========================================================================

  describe('Phase 1 — Import', () => {
    it('creates a new device when member exists and device is new', async () => {
      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice()],
      });

      expect(mockMemberFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_ID,
            deactivated: false,
          }),
          select: { id: true },
        }),
      );

      expect(mockDeviceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test MacBook',
            platform: 'macos',
            serialNumber: 'SN-001',
            memberId: 'mem_1',
            organizationId: ORG_ID,
            source: 'integration',
            integrationConnectionId: CONN_ID,
          }),
        }),
      );

      expect(result.imported).toBe(1);
      expect(result.totalFound).toBe(1);
      expect(result.details).toContainEqual(
        expect.objectContaining({
          status: 'imported',
        }),
      );
    });

    it('updates an existing integration device matched by serial number', async () => {
      mockDeviceFindFirst.mockResolvedValue({
        id: 'dev_existing',
        source: 'integration',
        serialNumber: 'SN-001',
        organizationId: ORG_ID,
      });

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [
          baseDevice({
            osVersion: '15.0',
            hardwareModel: 'MacBookPro18,1',
          }),
        ],
      });

      expect(mockDeviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev_existing' },
          data: expect.objectContaining({
            name: 'Test MacBook',
            osVersion: '15.0',
            hardwareModel: 'MacBookPro18,1',
            source: 'integration',
            integrationConnectionId: CONN_ID,
          }),
        }),
      );

      expect(mockDeviceCreate).not.toHaveBeenCalled();
      expect(result.updated).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('updates memberId when device ownership changes', async () => {
      mockDeviceFindFirst.mockResolvedValue({
        id: 'dev_existing',
        source: 'integration',
        serialNumber: 'SN-001',
        organizationId: ORG_ID,
      });
      mockMemberFindFirst.mockResolvedValue({ id: 'mem_new_owner' });

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice()],
      });

      expect(mockDeviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev_existing' },
          data: expect.objectContaining({
            memberId: 'mem_new_owner',
          }),
        }),
      );
      expect(result.updated).toBe(1);
    });

    it('refreshes memberId on the P2002 unique-constraint fallback update', async () => {
      // existingDevice lookup → null (forces a create), then the create hits a
      // unique constraint and the conflicting-row lookup returns the existing device.
      mockDeviceFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'dev_conflict',
          source: 'integration',
          serialNumber: 'SN-001',
          organizationId: ORG_ID,
        });
      mockMemberFindFirst.mockResolvedValue({ id: 'mem_new_owner' });
      mockDeviceCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice()],
      });

      // The fallback update must apply the current owner, not just static fields.
      expect(mockDeviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev_conflict' },
          data: expect.objectContaining({ memberId: 'mem_new_owner' }),
        }),
      );
      expect(result.updated).toBe(1);
    });

    it('falls back via externalDeviceId when create hits the externalId unique constraint', async () => {
      // externalId-only device (no serial): a concurrent create hits P2002 on
      // (integrationConnectionId, externalDeviceId); the fallback must re-find by
      // that key (not by an undefined serialNumber) and update.
      mockDeviceFindFirst
        .mockResolvedValueOnce(null) // Phase 1 externalId lookup → none yet
        .mockResolvedValueOnce({ id: 'dev_ext', source: 'integration' }); // fallback by externalId
      mockMemberFindFirst.mockResolvedValue({ id: 'mem_1' });
      mockDeviceCreate.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ serialNumber: undefined, externalId: 'ext-123' })],
      });

      expect(mockDeviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev_ext' },
          data: expect.objectContaining({
            memberId: 'mem_1',
            externalDeviceId: 'ext-123',
          }),
        }),
      );
      expect(result.updated).toBe(1);
      expect(result.errors).toBe(0);
    });

    it('backfills serialNumber when updating a device matched by externalId', async () => {
      // No serial match, but an externalId match exists; the update should
      // backfill the now-reported serial so the row becomes serial-linkable.
      mockDeviceFindFirst
        .mockResolvedValueOnce(null) // serial lookup → no match
        .mockResolvedValueOnce({ id: 'dev_ext', source: 'integration' }); // externalId match

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ serialNumber: 'SN-NEW', externalId: 'ext-1' })],
      });

      expect(mockDeviceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dev_ext' },
          data: expect.objectContaining({
            serialNumber: 'SN-NEW',
            externalDeviceId: 'ext-1',
          }),
        }),
      );
      expect(result.updated).toBe(1);
    });

    it('skips a device whose serial is already managed by the agent (no hijack)', async () => {
      mockDeviceFindFirst.mockResolvedValue({
        id: 'dev_agent',
        source: 'agent',
        serialNumber: 'SN-001',
        organizationId: ORG_ID,
      });

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice()],
      });

      expect(mockDeviceUpdate).not.toHaveBeenCalled();
      expect(mockDeviceCreate).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
      expect(result.details).toContainEqual(
        expect.objectContaining({
          status: 'skipped',
          reason: expect.stringContaining('agent'),
        }),
      );
    });

    it('skips a device that has neither serialNumber nor externalId', async () => {
      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [
          baseDevice({ serialNumber: undefined, externalId: undefined }),
        ],
      });

      expect(mockMemberFindFirst).not.toHaveBeenCalled();
      expect(mockDeviceCreate).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
      expect(result.details).toContainEqual(
        expect.objectContaining({
          status: 'skipped',
          reason: expect.stringContaining('identifier'),
        }),
      );
    });

    it('skips devices when no matching member exists', async () => {
      mockMemberFindFirst.mockResolvedValue(null);

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ userEmail: 'unknown@example.com' })],
      });

      expect(mockDeviceCreate).not.toHaveBeenCalled();
      expect(mockDeviceUpdate).not.toHaveBeenCalled();
      expect(result.skipped).toBe(1);
      expect(result.details).toContainEqual(
        expect.objectContaining({
          status: 'skipped',
          reason: expect.stringContaining('member'),
        }),
      );
    });

    it('only processes devices with status active', async () => {
      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [
          baseDevice({ status: 'active', serialNumber: 'SN-ACTIVE' }),
          baseDevice({ status: 'inactive', serialNumber: 'SN-INACTIVE' }),
        ],
      });

      // Only the active device should trigger a member lookup + create
      expect(mockMemberFindFirst).toHaveBeenCalledTimes(1);
      expect(result.imported).toBe(1);
      expect(result.totalFound).toBe(2);
    });
  });

  // ========================================================================
  // Phase 2 — Remove disappeared (only when isDirectorySource = true)
  // ========================================================================

  describe('Phase 2 — Remove disappeared', () => {
    it('is skipped entirely when isDirectorySource is not set (default)', async () => {
      mockDeviceFindMany.mockResolvedValue([
        {
          id: 'dev_old',
          serialNumber: 'SN-OLD',
          externalDeviceId: null,
          integrationConnectionId: CONN_ID,
        },
      ]);

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ serialNumber: 'SN-001' })],
      });

      // No pruning by default — a non-authoritative provider must never delete.
      expect(mockDeviceFindMany).not.toHaveBeenCalled();
      expect(mockDeviceDeleteMany).not.toHaveBeenCalled();
      expect(result.removed).toBe(0);
    });

    it('deletes stale devices when isDirectorySource = true', async () => {
      mockDeviceFindMany.mockResolvedValue([
        {
          id: 'dev_old',
          serialNumber: 'SN-OLD',
          externalDeviceId: null,
          integrationConnectionId: CONN_ID,
        },
        {
          id: 'dev_current',
          serialNumber: 'SN-001',
          externalDeviceId: null,
          integrationConnectionId: CONN_ID,
        },
      ]);

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ serialNumber: 'SN-001' })],
        options: { isDirectorySource: true },
      });

      expect(mockDeviceDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['dev_old'] } },
      });
      expect(result.removed).toBe(1);
    });

    it('should NOT delete existing devices when all sync devices were skipped (member not found)', async () => {
      mockMemberFindFirst.mockResolvedValue(null);
      mockDeviceFindMany.mockResolvedValue([
        {
          id: 'dev_existing',
          serialNumber: 'SN-001',
          externalDeviceId: null,
          integrationConnectionId: CONN_ID,
        },
      ]);

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ serialNumber: 'SN-001' })],
        options: { isDirectorySource: true },
      });

      // Device was skipped because member doesn't exist, but its identifier
      // is still tracked so Phase 2 won't remove it from the DB.
      expect(result.skipped).toBe(1);
      expect(result.removed).toBe(0);
      expect(mockDeviceDeleteMany).not.toHaveBeenCalled();
    });

    it('should skip Phase 2 when sync payload contains only inactive devices', async () => {
      mockDeviceFindMany.mockResolvedValue([
        {
          id: 'dev_existing',
          serialNumber: 'EXISTING',
          externalDeviceId: null,
          integrationConnectionId: CONN_ID,
        },
      ]);

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ status: 'inactive', serialNumber: 'SN-INACTIVE' })],
        options: { isDirectorySource: true },
      });

      // No active devices means no identifiers tracked → Phase 2 guard skips removal
      expect(result.removed).toBe(0);
      expect(mockDeviceDeleteMany).not.toHaveBeenCalled();
    });

    it('does NOT delete devices that are still in the sync result', async () => {
      mockDeviceFindMany.mockResolvedValue([
        {
          id: 'dev_current',
          serialNumber: 'SN-001',
          externalDeviceId: null,
          integrationConnectionId: CONN_ID,
        },
      ]);

      const result = await service.processDevices({
        organizationId: ORG_ID,
        connectionId: CONN_ID,
        devices: [baseDevice({ serialNumber: 'SN-001' })],
        options: { isDirectorySource: true },
      });

      expect(mockDeviceDeleteMany).not.toHaveBeenCalled();
      expect(result.removed).toBe(0);
    });
  });
});

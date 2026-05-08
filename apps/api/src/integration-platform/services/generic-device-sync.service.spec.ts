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

    it('updates an existing device matched by serial number', async () => {
      mockDeviceFindFirst.mockResolvedValue({
        id: 'dev_existing',
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
  // Phase 2 — Remove disappeared
  // ========================================================================

  describe('Phase 2 — Remove disappeared', () => {
    it('deletes devices from this connection that are no longer in the sync result', async () => {
      // Phase 2: existing devices in DB for this connection
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
      });

      expect(mockDeviceDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['dev_old'] } },
      });
      expect(result.removed).toBe(1);
    });

    it('should NOT delete existing devices when all sync devices were skipped', async () => {
      mockMemberFindFirst.mockResolvedValue(null);
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
        devices: [baseDevice()],
      });

      expect(result.skipped).toBe(1);
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
      });

      expect(mockDeviceDeleteMany).not.toHaveBeenCalled();
      expect(result.removed).toBe(0);
    });
  });
});

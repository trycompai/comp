import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { IntegrationSyncLoggerService } from '../services/integration-sync-logger.service';
import { GenericEmployeeSyncService } from '../services/generic-employee-sync.service';
import { GenericDeviceSyncService } from '../services/generic-device-sync.service';
import { DynamicIntegrationRepository } from '../repositories/dynamic-integration.repository';
import { CheckRunRepository } from '../repositories/check-run.repository';

const mockConnectionFindFirst = jest.fn();
const mockGetActiveManifests = jest.fn();

jest.mock('@db', () => ({
  db: {
    integrationConnection: {
      findFirst: (...args: unknown[]) => mockConnectionFindFirst(...args),
    },
  },
}));

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { integration: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@trycompai/integration-platform', () => {
  const actual = jest.requireActual<
    typeof import('@trycompai/integration-platform')
  >('@trycompai/integration-platform');
  return {
    ...actual,
    registry: {
      getActiveManifests: (...args: unknown[]) =>
        mockGetActiveManifests(...args),
    },
    TASK_TEMPLATE_INFO: {},
  };
});

describe('SyncController - getAvailableSyncProviders connection status', () => {
  let controller: SyncController;

  const orgId = 'org_test123';
  const intuneManifest = {
    id: 'intune',
    name: 'Intune',
    logoUrl: 'https://example.com/intune.png',
    capabilities: ['checks', 'device_sync'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockGetActiveManifests.mockReturnValue([intuneManifest]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: ConnectionRepository,
          useValue: { findById: jest.fn(), update: jest.fn() },
        },
        {
          provide: CredentialVaultService,
          useValue: {
            getDecryptedCredentials: jest.fn(),
            refreshOAuthTokens: jest.fn(),
          },
        },
        {
          provide: OAuthCredentialsService,
          useValue: { getCredentials: jest.fn() },
        },
        {
          provide: IntegrationSyncLoggerService,
          useValue: { logSync: jest.fn() },
        },
        { provide: GenericEmployeeSyncService, useValue: {} },
        { provide: GenericDeviceSyncService, useValue: {} },
        { provide: DynamicIntegrationRepository, useValue: {} },
        {
          provide: CheckRunRepository,
          useValue: { create: jest.fn(), complete: jest.fn() },
        },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SyncController>(SyncController);
  });

  it('reports connected + connectionStatus active for an active connection', async () => {
    mockConnectionFindFirst.mockImplementation(
      (args: { where: { status: string } }) =>
        args.where.status === 'active'
          ? {
              id: 'icn_active',
              status: 'active',
              lastSyncAt: null,
              nextSyncAt: null,
            }
          : null,
    );

    const result = await controller.getAvailableSyncProviders(orgId, 'device');

    expect(result.providers).toEqual([
      expect.objectContaining({
        slug: 'intune',
        connected: true,
        connectionStatus: 'active',
        connectionId: 'icn_active',
      }),
    ]);
    // With an active connection there is no need to look up an errored one.
    expect(mockConnectionFindFirst).toHaveBeenCalledTimes(1);
  });

  it('reports connectionStatus error (not connected) when the latest connection is broken', async () => {
    mockConnectionFindFirst.mockImplementation(
      (args: { where: { status?: string } }) =>
        args.where.status === 'active' ? null : { status: 'error' },
    );

    const result = await controller.getAvailableSyncProviders(orgId, 'device');

    expect(result.providers).toEqual([
      expect.objectContaining({
        slug: 'intune',
        connected: false,
        connectionStatus: 'error',
        connectionId: null,
      }),
    ]);
  });

  it('does not resurface a stale error when the latest connection is disconnected', async () => {
    // Reconnects create new rows, so an old 'error' row can coexist with a
    // newer 'disconnected' one. The latest row (disconnected) must win.
    mockConnectionFindFirst.mockImplementation(
      (args: { where: { status?: string } }) =>
        args.where.status === 'active' ? null : { status: 'disconnected' },
    );

    const result = await controller.getAvailableSyncProviders(orgId, 'device');

    expect(result.providers).toEqual([
      expect.objectContaining({
        slug: 'intune',
        connected: false,
        connectionStatus: null,
        connectionId: null,
      }),
    ]);
    // The fallback must pick the LATEST row regardless of status (no status
    // filter), ordered by recency — not hunt for any old 'error' row.
    const fallbackArgs = mockConnectionFindFirst.mock.calls[1][0] as {
      where: { status?: string };
      orderBy: { updatedAt: string };
    };
    expect(fallbackArgs.where.status).toBeUndefined();
    expect(fallbackArgs.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('reports connectionStatus null when the org has no connection for the provider', async () => {
    mockConnectionFindFirst.mockResolvedValue(null);

    const result = await controller.getAvailableSyncProviders(orgId, 'device');

    expect(result.providers).toEqual([
      expect.objectContaining({
        slug: 'intune',
        connected: false,
        connectionStatus: null,
        connectionId: null,
      }),
    ]);
  });
});

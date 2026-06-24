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
import type { SyncEmployee } from '@trycompai/integration-platform';

const mockGetManifest = jest.fn();
const mockInterpretDeclarativeSync = jest.fn();
const mockCreateCheckContext = jest.fn();

jest.mock('@db', () => ({ db: {} }));

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
    getManifest: (...args: unknown[]) => mockGetManifest(...args),
    interpretDeclarativeSync: (...args: unknown[]) =>
      mockInterpretDeclarativeSync(...args),
    createCheckContext: (...args: unknown[]) => mockCreateCheckContext(...args),
    TASK_TEMPLATE_INFO: {},
  };
});

describe('SyncController - dynamic provider employee sync filter', () => {
  let controller: SyncController;
  const mockProcessEmployees = jest.fn();
  const mockFindById = jest.fn();
  const mockFindBySlug = jest.fn();
  const mockGetDecryptedCredentials = jest.fn();
  const mockCheckRunCreate = jest.fn();
  const mockCheckRunComplete = jest.fn();

  const orgId = 'org_test123';
  const connectionId = 'conn_test123';
  const providerSlug = 'entra-id';

  const employees: SyncEmployee[] = [
    { email: 'keep@example.com', status: 'active' },
    { email: 'excluded@example.com', status: 'active' },
  ];

  async function runSync(variables: Record<string, unknown>) {
    mockFindById.mockResolvedValue({
      id: connectionId,
      organizationId: orgId,
      variables,
      metadata: {},
    });
    mockGetManifest.mockReturnValue({
      name: 'Microsoft Entra ID',
      auth: { type: 'api_key' },
      capabilities: ['sync'],
    });
    mockFindBySlug.mockResolvedValue({
      syncDefinition: {
        steps: [],
        employeesPath: 'employees',
        isDirectorySource: true,
      },
    });
    mockGetDecryptedCredentials.mockResolvedValue({ api_key: 'fake-key' });
    mockCheckRunCreate.mockResolvedValue({ id: 'run_1', startedAt: new Date() });
    mockCheckRunComplete.mockResolvedValue(undefined);
    mockInterpretDeclarativeSync.mockReturnValue({
      run: jest.fn().mockResolvedValue(employees),
    });
    mockCreateCheckContext.mockReturnValue({
      ctx: {},
      getResults: () => ({ logs: [] }),
    });
    mockProcessEmployees.mockResolvedValue({
      success: true,
      totalFound: employees.length,
      imported: 1,
      skipped: 0,
      deactivated: 0,
      reactivated: 0,
      errors: 0,
      details: [],
    });

    return controller.syncDynamicProviderEmployees(
      orgId,
      providerSlug,
      connectionId,
    );
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: ConnectionRepository,
          useValue: { findById: mockFindById, update: jest.fn() },
        },
        {
          provide: CredentialVaultService,
          useValue: {
            getDecryptedCredentials: mockGetDecryptedCredentials,
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
        {
          provide: GenericEmployeeSyncService,
          useValue: { processEmployees: mockProcessEmployees },
        },
        { provide: GenericDeviceSyncService, useValue: {} },
        {
          provide: DynamicIntegrationRepository,
          useValue: { findBySlug: mockFindBySlug },
        },
        {
          provide: CheckRunRepository,
          useValue: { create: mockCheckRunCreate, complete: mockCheckRunComplete },
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

  it('passes the resolved exclude filter from connection.variables to processEmployees', async () => {
    await runSync({
      sync_user_filter_mode: 'exclude',
      sync_excluded_emails: 'excluded@example.com',
    });

    expect(mockProcessEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        employees,
        options: expect.objectContaining({
          syncFilter: {
            mode: 'exclude',
            excludedTerms: ['excluded@example.com'],
            includedTerms: [],
          },
        }),
      }),
    );
  });

  it('passes the resolved include filter from connection.variables to processEmployees', async () => {
    await runSync({
      sync_user_filter_mode: 'include',
      sync_included_emails: 'keep@example.com',
    });

    expect(mockProcessEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          syncFilter: {
            mode: 'include',
            excludedTerms: [],
            includedTerms: ['keep@example.com'],
          },
        }),
      }),
    );
  });

  it('defaults to mode "all" when no filter variables are configured', async () => {
    await runSync({});

    expect(mockProcessEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          syncFilter: { mode: 'all', excludedTerms: [], includedTerms: [] },
        }),
      }),
    );
  });
});

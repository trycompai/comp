import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionsController } from './connections.controller';
import { ConnectionService } from '../services/connection.service';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionRepository } from '../repositories/connection.repository';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { getManifest } from '@trycompai/integration-platform';

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    integration: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@db', () => ({
  db: {
    integrationProvider: { findUnique: jest.fn() },
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
  getAllManifests: jest.fn(),
  getActiveManifests: jest.fn(),
  TASK_TEMPLATE_INFO: {},
}));

const mockedGetManifest = getManifest as jest.MockedFunction<
  typeof getManifest
>;

type MockConnection = Awaited<
  ReturnType<ConnectionService['getConnectionForOrg']>
> & {
  provider: { slug: string };
};

const makeConnection = (status: 'active' | 'error'): MockConnection => ({
  id: 'conn_1',
  providerId: 'prv_1',
  organizationId: 'org_1',
  status,
  authStrategy: 'oauth2',
  activeCredentialVersionId: 'icv_1',
  lastSyncAt: null,
  nextSyncAt: null,
  syncCadence: null,
  metadata: {},
  variables: {},
  errorMessage: status === 'error' ? 'Refresh token invalid' : null,
  refreshLeaseUntil: null,
  refreshLeaseToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  provider: { slug: 'gcp' },
});

function expectHttpException(
  error: unknown,
  status: HttpStatus,
): HttpException {
  if (!(error instanceof HttpException)) {
    throw new Error('Expected HttpException');
  }
  expect(error.getStatus()).toBe(status);
  return error;
}

async function createController() {
  const connectionService = {
    getConnectionForOrg: jest.fn(),
    setConnectionError: jest.fn(),
  };
  const credentialVaultService = {
    needsRefresh: jest.fn(),
    refreshOAuthTokens: jest.fn(),
    getDecryptedCredentials: jest.fn(),
  };
  const oauthCredentialsService = {
    getCredentials: jest.fn(),
  };
  const autoCheckRunnerService = {
    tryAutoRunChecks: jest.fn(),
  };
  const providerRepository = {
    upsert: jest.fn(),
  };
  const connectionRepository = {
    update: jest.fn(),
  };
  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [ConnectionsController],
    providers: [
      { provide: ConnectionService, useValue: connectionService },
      { provide: CredentialVaultService, useValue: credentialVaultService },
      { provide: OAuthCredentialsService, useValue: oauthCredentialsService },
      { provide: AutoCheckRunnerService, useValue: autoCheckRunnerService },
      { provide: ProviderRepository, useValue: providerRepository },
      { provide: ConnectionRepository, useValue: connectionRepository },
    ],
  })
    .overrideGuard(HybridAuthGuard)
    .useValue(mockGuard)
    .overrideGuard(PermissionGuard)
    .useValue(mockGuard)
    .compile();

  return {
    controller: module.get<ConnectionsController>(ConnectionsController),
    connectionService,
    credentialVaultService,
    oauthCredentialsService,
  };
}

describe('ConnectionsController ensureValidCredentials refresh failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetManifest.mockReturnValue({
      auth: {
        type: 'oauth2',
        config: {
          tokenUrl: 'https://oauth2.googleapis.com/token',
          refreshUrl: undefined,
          clientAuthMethod: 'body',
          supportsRefreshToken: true,
          tokenParams: undefined,
        },
      },
    } as never);
  });

  it('returns 503 without setting connection error for retryable refresh failures', async () => {
    const {
      controller,
      connectionService,
      credentialVaultService,
      oauthCredentialsService,
    } = await createController();

    connectionService.getConnectionForOrg.mockResolvedValue(
      makeConnection('active'),
    );
    credentialVaultService.needsRefresh.mockResolvedValue(true);
    credentialVaultService.refreshOAuthTokens.mockResolvedValue(null);
    oauthCredentialsService.getCredentials.mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      source: 'platform',
    });

    try {
      await controller.ensureValidCredentials('conn_1', 'org_1');
      throw new Error('Expected ensureValidCredentials to throw');
    } catch (error) {
      expectHttpException(error, HttpStatus.SERVICE_UNAVAILABLE);
    }

    expect(connectionService.setConnectionError).not.toHaveBeenCalled();
  });

  it('returns 401 when the vault has marked the connection as terminally invalid', async () => {
    const {
      controller,
      connectionService,
      credentialVaultService,
      oauthCredentialsService,
    } = await createController();

    connectionService.getConnectionForOrg
      .mockResolvedValueOnce(makeConnection('active'))
      .mockResolvedValueOnce(makeConnection('error'));
    credentialVaultService.needsRefresh.mockResolvedValue(true);
    credentialVaultService.refreshOAuthTokens.mockResolvedValue(null);
    oauthCredentialsService.getCredentials.mockResolvedValue({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      source: 'platform',
    });

    try {
      await controller.ensureValidCredentials('conn_1', 'org_1');
      throw new Error('Expected ensureValidCredentials to throw');
    } catch (error) {
      const exception = expectHttpException(error, HttpStatus.UNAUTHORIZED);
      expect(exception.getResponse()).toBe('Refresh token invalid');
    }

    expect(connectionService.setConnectionError).not.toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ConnectionService } from '../services/connection.service';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';
import { ProviderRepository } from '../repositories/provider.repository';

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    integration: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@comp/integration-platform', () => ({
  getManifest: jest.fn(),
  getAllManifests: jest.fn(),
  getActiveManifests: jest.fn(),
  TASK_TEMPLATE_INFO: {},
}));

import {
  getManifest,
  getAllManifests,
  getActiveManifests,
} from '@comp/integration-platform';

const mockedGetManifest = getManifest as jest.MockedFunction<
  typeof getManifest
>;
const mockedGetAllManifests = getAllManifests as jest.MockedFunction<
  typeof getAllManifests
>;
const mockedGetActiveManifests = getActiveManifests as jest.MockedFunction<
  typeof getActiveManifests
>;

describe('ConnectionsController', () => {
  let controller: ConnectionsController;

  const mockConnectionService = {
    getOrganizationConnections: jest.fn(),
    getConnection: jest.fn(),
    createConnection: jest.fn(),
    activateConnection: jest.fn(),
    pauseConnection: jest.fn(),
    disconnectConnection: jest.fn(),
    deleteConnection: jest.fn(),
    setConnectionError: jest.fn(),
    updateConnectionMetadata: jest.fn(),
  };

  const mockCredentialVaultService = {
    storeApiKeyCredentials: jest.fn(),
    getDecryptedCredentials: jest.fn(),
    needsRefresh: jest.fn(),
    refreshOAuthTokens: jest.fn(),
  };

  const mockOAuthCredentialsService = {
    checkAvailability: jest.fn(),
    getCredentials: jest.fn(),
  };

  const mockAutoCheckRunnerService = {
    tryAutoRunChecks: jest.fn().mockResolvedValue(false),
  };

  const mockProviderRepository = {
    upsert: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectionsController],
      providers: [
        { provide: ConnectionService, useValue: mockConnectionService },
        {
          provide: CredentialVaultService,
          useValue: mockCredentialVaultService,
        },
        {
          provide: OAuthCredentialsService,
          useValue: mockOAuthCredentialsService,
        },
        {
          provide: AutoCheckRunnerService,
          useValue: mockAutoCheckRunnerService,
        },
        { provide: ProviderRepository, useValue: mockProviderRepository },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ConnectionsController>(ConnectionsController);

    jest.clearAllMocks();
    mockAutoCheckRunnerService.tryAutoRunChecks.mockResolvedValue(false);
  });

  describe('listProviders', () => {
    it('should return all manifests when activeOnly is not set', async () => {
      const manifests = [
        {
          id: 'github',
          name: 'GitHub',
          description: 'GitHub integration',
          category: 'dev',
          logoUrl: '/github.svg',
          auth: { type: 'oauth2' },
          capabilities: ['checks'],
          isActive: true,
          docsUrl: 'https://docs.example.com',
          credentialFields: [],
          checks: [],
          variables: [],
        },
      ];
      mockedGetAllManifests.mockReturnValue(manifests as never);
      mockOAuthCredentialsService.checkAvailability.mockResolvedValue({
        hasPlatformCredentials: true,
      });

      const result = await controller.listProviders();

      expect(mockedGetAllManifests).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('github');
    });

    it('should return active manifests when activeOnly is true', async () => {
      mockedGetActiveManifests.mockReturnValue([]);

      await controller.listProviders('true');

      expect(mockedGetActiveManifests).toHaveBeenCalled();
    });
  });

  describe('getProvider', () => {
    it('should return provider details', async () => {
      const manifest = {
        id: 'github',
        name: 'GitHub',
        description: 'GitHub integration',
        category: 'dev',
        logoUrl: '/github.svg',
        auth: { type: 'oauth2' },
        capabilities: ['checks'],
        isActive: true,
        docsUrl: 'https://docs.example.com',
        credentialFields: [],
        checks: [],
        variables: [],
      };
      mockedGetManifest.mockReturnValue(manifest as never);

      const result = await controller.getProvider('github');

      expect(result.id).toBe('github');
      expect(result.name).toBe('GitHub');
    });

    it('should throw NOT_FOUND when provider does not exist', async () => {
      mockedGetManifest.mockReturnValue(undefined as never);

      await expect(controller.getProvider('nonexistent')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('listConnections', () => {
    it('should call service.getOrganizationConnections', async () => {
      const connections = [
        {
          id: 'conn_1',
          providerId: 'prov_1',
          provider: { slug: 'github', name: 'GitHub' },
          status: 'active',
          authStrategy: 'oauth2',
          lastSyncAt: null,
          nextSyncAt: null,
          errorMessage: null,
          variables: {},
          metadata: {},
          createdAt: new Date(),
        },
      ];
      mockConnectionService.getOrganizationConnections.mockResolvedValue(
        connections,
      );

      const result = await controller.listConnections('org_1');

      expect(
        mockConnectionService.getOrganizationConnections,
      ).toHaveBeenCalledWith('org_1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('conn_1');
      expect(result[0].providerSlug).toBe('github');
    });
  });

  describe('getConnection', () => {
    it('should return connection details', async () => {
      const connection = {
        id: 'conn_1',
        providerId: 'prov_1',
        provider: { slug: 'github', name: 'GitHub' },
        status: 'active',
        authStrategy: 'oauth2',
        lastSyncAt: null,
        nextSyncAt: null,
        syncCadence: null,
        metadata: {},
        variables: {},
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockConnectionService.getConnection.mockResolvedValue(connection);
      mockedGetManifest.mockReturnValue(undefined as never);

      const result = await controller.getConnection('conn_1');

      expect(mockConnectionService.getConnection).toHaveBeenCalledWith(
        'conn_1',
      );
      expect(result.id).toBe('conn_1');
      expect(result.providerSlug).toBe('github');
    });
  });

  describe('createConnection', () => {
    it('should create a connection for non-OAuth provider', async () => {
      const manifest = {
        id: 'datadog',
        name: 'Datadog',
        category: 'monitoring',
        auth: { type: 'api_key', config: { name: 'api_key' } },
        capabilities: ['checks'],
        isActive: true,
        credentialFields: [],
        checks: [],
      };
      mockedGetManifest.mockReturnValue(manifest as never);
      mockProviderRepository.upsert.mockResolvedValue(undefined);
      mockConnectionService.createConnection.mockResolvedValue({
        id: 'conn_new',
        providerId: 'prov_dd',
        authStrategy: 'api_key',
        createdAt: new Date(),
      });
      mockConnectionService.activateConnection.mockResolvedValue(undefined);

      const result = await controller.createConnection('org_1', {
        providerSlug: 'datadog',
        credentials: { api_key: 'test-key' },
      });

      expect(mockProviderRepository.upsert).toHaveBeenCalled();
      expect(mockConnectionService.createConnection).toHaveBeenCalledWith({
        providerSlug: 'datadog',
        organizationId: 'org_1',
        authStrategy: 'api_key',
        metadata: undefined,
      });
      expect(
        mockCredentialVaultService.storeApiKeyCredentials,
      ).toHaveBeenCalledWith('conn_new', { api_key: 'test-key' });
      expect(mockConnectionService.activateConnection).toHaveBeenCalledWith(
        'conn_new',
      );
      expect(result.id).toBe('conn_new');
      expect(result.status).toBe('active');
    });

    it('should throw NOT_FOUND when provider does not exist', async () => {
      mockedGetManifest.mockReturnValue(undefined as never);

      await expect(
        controller.createConnection('org_1', {
          providerSlug: 'nonexistent',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST for OAuth providers', async () => {
      const manifest = {
        id: 'github',
        name: 'GitHub',
        auth: { type: 'oauth2' },
      };
      mockedGetManifest.mockReturnValue(manifest as never);

      await expect(
        controller.createConnection('org_1', {
          providerSlug: 'github',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('testConnection', () => {
    it('should throw NOT_FOUND when provider slug is missing', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        provider: undefined,
      });

      await expect(controller.testConnection('conn_1')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw BAD_REQUEST when no credentials found', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        provider: { slug: 'datadog' },
      });
      mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue(
        null,
      );

      await expect(controller.testConnection('conn_1')).rejects.toThrow(
        HttpException,
      );
    });

    it('should activate connection when no handler is defined', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        provider: { slug: 'custom-provider' },
      });
      mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue({
        api_key: 'test',
      });
      mockedGetManifest.mockReturnValue({
        auth: { type: 'api_key' },
        handler: undefined,
      } as never);
      mockConnectionService.activateConnection.mockResolvedValue(undefined);

      const result = await controller.testConnection('conn_1');

      expect(mockConnectionService.activateConnection).toHaveBeenCalledWith(
        'conn_1',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('pauseConnection', () => {
    it('should call service.pauseConnection', async () => {
      mockConnectionService.pauseConnection.mockResolvedValue({
        id: 'conn_1',
        status: 'paused',
      });

      const result = await controller.pauseConnection('conn_1');

      expect(mockConnectionService.pauseConnection).toHaveBeenCalledWith(
        'conn_1',
      );
      expect(result).toEqual({ id: 'conn_1', status: 'paused' });
    });
  });

  describe('resumeConnection', () => {
    it('should call service.activateConnection', async () => {
      mockConnectionService.activateConnection.mockResolvedValue({
        id: 'conn_1',
        status: 'active',
      });

      const result = await controller.resumeConnection('conn_1');

      expect(mockConnectionService.activateConnection).toHaveBeenCalledWith(
        'conn_1',
      );
      expect(result).toEqual({ id: 'conn_1', status: 'active' });
    });
  });

  describe('disconnectConnection', () => {
    it('should call service.disconnectConnection', async () => {
      mockConnectionService.disconnectConnection.mockResolvedValue({
        id: 'conn_1',
        status: 'disconnected',
      });

      const result = await controller.disconnectConnection('conn_1');

      expect(mockConnectionService.disconnectConnection).toHaveBeenCalledWith(
        'conn_1',
      );
      expect(result).toEqual({ id: 'conn_1', status: 'disconnected' });
    });
  });

  describe('deleteConnection', () => {
    it('should call service.deleteConnection', async () => {
      mockConnectionService.deleteConnection.mockResolvedValue(undefined);

      const result = await controller.deleteConnection('conn_1');

      expect(mockConnectionService.deleteConnection).toHaveBeenCalledWith(
        'conn_1',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateConnection', () => {
    it('should merge metadata and update', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        metadata: { existing: 'value' },
      });
      mockConnectionService.updateConnectionMetadata.mockResolvedValue(
        undefined,
      );

      const result = await controller.updateConnection('conn_1', 'org_1', {
        metadata: { newField: 'newValue' },
      });

      expect(
        mockConnectionService.updateConnectionMetadata,
      ).toHaveBeenCalledWith('conn_1', {
        existing: 'value',
        newField: 'newValue',
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw FORBIDDEN when org does not match', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_other',
        metadata: {},
      });

      await expect(
        controller.updateConnection('conn_1', 'org_1', {
          metadata: { key: 'val' },
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('ensureValidCredentials', () => {
    it('should throw NOT_FOUND when org does not match', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_other',
        status: 'active',
      });

      await expect(
        controller.ensureValidCredentials('conn_1', 'org_1'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST when connection is not active', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        status: 'paused',
      });

      await expect(
        controller.ensureValidCredentials('conn_1', 'org_1'),
      ).rejects.toThrow(HttpException);
    });

    it('should return credentials for api_key auth', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        status: 'active',
        provider: { slug: 'datadog' },
      });
      mockedGetManifest.mockReturnValue({
        auth: { type: 'api_key', config: { name: 'api_key' } },
      } as never);
      mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue({
        api_key: 'test-key',
      });

      const result = await controller.ensureValidCredentials(
        'conn_1',
        'org_1',
      );

      expect(result.success).toBe(true);
      expect(result.credentials).toEqual({ api_key: 'test-key' });
    });
  });

  describe('updateCredentials', () => {
    it('should throw NOT_FOUND when org does not match', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_other',
        provider: { slug: 'datadog' },
      });

      await expect(
        controller.updateCredentials('conn_1', 'org_1', {
          credentials: { api_key: 'new' },
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST for OAuth integrations', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        provider: { slug: 'github' },
      });
      mockedGetManifest.mockReturnValue({
        auth: { type: 'oauth2' },
      } as never);

      await expect(
        controller.updateCredentials('conn_1', 'org_1', {
          credentials: { token: 'new' },
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should merge and store credentials', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        status: 'active',
        provider: { slug: 'datadog' },
      });
      mockedGetManifest.mockReturnValue({
        id: 'datadog',
        auth: { type: 'api_key', config: { name: 'api_key' } },
      } as never);
      mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue({
        api_key: 'old-key',
        app_key: 'existing',
      });

      const result = await controller.updateCredentials('conn_1', 'org_1', {
        credentials: { api_key: 'new-key' },
      });

      expect(
        mockCredentialVaultService.storeApiKeyCredentials,
      ).toHaveBeenCalledWith('conn_1', {
        api_key: 'new-key',
        app_key: 'existing',
      });
      expect(result).toEqual({ success: true });
    });

    it('should activate connection if it was in error state', async () => {
      mockConnectionService.getConnection.mockResolvedValue({
        id: 'conn_1',
        organizationId: 'org_1',
        status: 'error',
        provider: { slug: 'datadog' },
      });
      mockedGetManifest.mockReturnValue({
        id: 'datadog',
        auth: { type: 'api_key', config: { name: 'api_key' } },
      } as never);
      mockCredentialVaultService.getDecryptedCredentials.mockResolvedValue({});

      await controller.updateCredentials('conn_1', 'org_1', {
        credentials: { api_key: 'new-key' },
      });

      expect(mockConnectionService.activateConnection).toHaveBeenCalledWith(
        'conn_1',
      );
    });
  });
});

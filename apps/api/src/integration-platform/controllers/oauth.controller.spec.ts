import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { OAuthController } from './oauth.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { OAuthStateRepository } from '../repositories/oauth-state.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ConnectionService } from '../services/connection.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';

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
}));

import { getManifest } from '@comp/integration-platform';

const mockedGetManifest = getManifest as jest.MockedFunction<
  typeof getManifest
>;

describe('OAuthController', () => {
  let controller: OAuthController;

  const mockOAuthStateRepository = {
    create: jest.fn(),
    findByState: jest.fn(),
    delete: jest.fn(),
  };

  const mockProviderRepository = {
    upsert: jest.fn(),
    findBySlug: jest.fn(),
  };

  const mockConnectionRepository = {
    findByProviderAndOrg: jest.fn(),
  };

  const mockCredentialVaultService = {
    storeOAuthTokens: jest.fn(),
  };

  const mockConnectionService = {
    createConnection: jest.fn(),
  };

  const mockOAuthCredentialsService = {
    checkAvailability: jest.fn(),
    getCredentials: jest.fn(),
  };

  const mockAutoCheckRunnerService = {
    tryAutoRunChecks: jest.fn().mockResolvedValue(false),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        { provide: OAuthStateRepository, useValue: mockOAuthStateRepository },
        { provide: ProviderRepository, useValue: mockProviderRepository },
        { provide: ConnectionRepository, useValue: mockConnectionRepository },
        {
          provide: CredentialVaultService,
          useValue: mockCredentialVaultService,
        },
        { provide: ConnectionService, useValue: mockConnectionService },
        {
          provide: OAuthCredentialsService,
          useValue: mockOAuthCredentialsService,
        },
        {
          provide: AutoCheckRunnerService,
          useValue: mockAutoCheckRunnerService,
        },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OAuthController>(OAuthController);

    jest.clearAllMocks();
    mockAutoCheckRunnerService.tryAutoRunChecks.mockResolvedValue(false);
  });

  describe('checkAvailability', () => {
    it('should call oauthCredentialsService.checkAvailability', async () => {
      const availability = {
        hasPlatformCredentials: true,
        hasOrgCredentials: false,
      };
      mockOAuthCredentialsService.checkAvailability.mockResolvedValue(
        availability,
      );

      const result = await controller.checkAvailability('github', 'org_1');

      expect(
        mockOAuthCredentialsService.checkAvailability,
      ).toHaveBeenCalledWith('github', 'org_1');
      expect(result).toEqual(availability);
    });

    it('should throw BAD_REQUEST when providerSlug is empty', async () => {
      await expect(
        controller.checkAvailability('', 'org_1'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('startOAuth', () => {
    it('should throw NOT_FOUND when provider does not exist', async () => {
      mockedGetManifest.mockReturnValue(undefined as never);

      await expect(
        controller.startOAuth('org_1', {
          providerSlug: 'nonexistent',
          userId: 'user_1',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST when provider is not OAuth', async () => {
      mockedGetManifest.mockReturnValue({
        auth: { type: 'api_key' },
      } as never);

      await expect(
        controller.startOAuth('org_1', {
          providerSlug: 'datadog',
          userId: 'user_1',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw PRECONDITION_FAILED when no credentials available', async () => {
      mockedGetManifest.mockReturnValue({
        id: 'github',
        name: 'GitHub',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
          },
        },
        category: 'dev',
        capabilities: [],
        isActive: true,
      } as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue(null);
      mockOAuthCredentialsService.checkAvailability.mockResolvedValue({
        hasPlatformCredentials: false,
        setupInstructions: 'Create an OAuth app',
        createAppUrl: 'https://github.com/settings/apps',
      });

      await expect(
        controller.startOAuth('org_1', {
          providerSlug: 'github',
          userId: 'user_1',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should return authorization URL on success', async () => {
      const manifest = {
        id: 'github',
        name: 'GitHub',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            pkce: false,
          },
        },
        category: 'dev',
        capabilities: [],
        isActive: true,
      };
      mockedGetManifest.mockReturnValue(manifest as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        scopes: ['repo', 'user'],
        source: 'platform',
      });
      mockProviderRepository.upsert.mockResolvedValue(undefined);
      mockOAuthStateRepository.create.mockResolvedValue({
        state: 'random_state_token',
      });

      const result = await controller.startOAuth('org_1', {
        providerSlug: 'github',
        userId: 'user_1',
      });

      expect(result.authorizationUrl).toContain(
        'https://github.com/login/oauth/authorize',
      );
      expect(result.authorizationUrl).toContain('client_id=client_123');
      expect(result.authorizationUrl).toContain('state=random_state_token');
      expect(result.authorizationUrl).toContain('scope=repo+user');
      expect(mockProviderRepository.upsert).toHaveBeenCalled();
      expect(mockOAuthStateRepository.create).toHaveBeenCalledWith({
        providerSlug: 'github',
        organizationId: 'org_1',
        userId: 'user_1',
        codeVerifier: undefined,
        redirectUrl: undefined,
      });
    });

    it('should include PKCE params when enabled', async () => {
      const manifest = {
        id: 'linear',
        name: 'Linear',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl: 'https://linear.app/oauth/authorize',
            tokenUrl: 'https://api.linear.app/oauth/token',
            pkce: true,
          },
        },
        category: 'dev',
        capabilities: [],
        isActive: true,
      };
      mockedGetManifest.mockReturnValue(manifest as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_abc',
        clientSecret: 'secret_xyz',
        scopes: [],
        source: 'platform',
      });
      mockProviderRepository.upsert.mockResolvedValue(undefined);
      mockOAuthStateRepository.create.mockResolvedValue({
        state: 'state_abc',
      });

      const result = await controller.startOAuth('org_1', {
        providerSlug: 'linear',
        userId: 'user_1',
      });

      expect(result.authorizationUrl).toContain('code_challenge=');
      expect(result.authorizationUrl).toContain('code_challenge_method=S256');
    });
  });

  describe('oauthCallback', () => {
    const mockResponse = {
      redirect: jest.fn(),
    } as unknown as import('express').Response;

    beforeEach(() => {
      (mockResponse.redirect as jest.Mock).mockClear();
    });

    it('should redirect with error when OAuth error is present', async () => {
      await controller.oauthCallback(
        {
          code: '',
          state: '',
          error: 'access_denied',
          error_description: 'User denied access',
        },
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=access_denied');
    });

    it('should redirect with error when code or state is missing', async () => {
      await controller.oauthCallback(
        { code: '', state: '' },
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=invalid_request');
    });

    it('should redirect with error when state is invalid', async () => {
      mockOAuthStateRepository.findByState.mockResolvedValue(null);

      await controller.oauthCallback(
        { code: 'auth_code', state: 'invalid_state' },
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=invalid_state');
    });

    it('should redirect with error when state is expired', async () => {
      const expiredDate = new Date(Date.now() - 60000);
      mockOAuthStateRepository.findByState.mockResolvedValue({
        state: 'expired_state',
        providerSlug: 'github',
        organizationId: 'org_1',
        redirectUrl: null,
        expiresAt: expiredDate,
      });

      await controller.oauthCallback(
        { code: 'auth_code', state: 'expired_state' },
        mockResponse,
      );

      expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
        'expired_state',
      );
      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=expired_state');
    });

    it('should redirect with error when manifest is not found', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockOAuthStateRepository.findByState.mockResolvedValue({
        state: 'valid_state',
        providerSlug: 'nonexistent',
        organizationId: 'org_1',
        userId: 'user_1',
        codeVerifier: null,
        redirectUrl: null,
        expiresAt: futureDate,
      });
      mockedGetManifest.mockReturnValue(undefined as never);

      await controller.oauthCallback(
        { code: 'auth_code', state: 'valid_state' },
        mockResponse,
      );

      expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
        'valid_state',
      );
      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=token_exchange_failed');
    });
  });
});

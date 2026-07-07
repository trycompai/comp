import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import { OAuthController } from './oauth.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { SessionOnlyGuard } from '../../auth/session-only.guard';
import { OAuthStateRepository } from '../repositories/oauth-state.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ConnectionService } from '../services/connection.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';
import { CloudSecurityService } from '../../cloud-security/cloud-security.service';

jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
}));

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

import { auth } from '../../auth/auth.server';

const mockedGetSession = auth.api.getSession as jest.MockedFunction<
  typeof auth.api.getSession
>;

jest.mock('../../auth/hybrid-auth.guard', () => ({
  HybridAuthGuard: class HybridAuthGuard {},
}));

jest.mock('../../auth/permission.guard', () => ({
  PermissionGuard: class PermissionGuard {},
}));

jest.mock('../../auth/session-only.guard', () => ({
  SessionOnlyGuard: class SessionOnlyGuard {},
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    integration: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
}));

jest.mock('@trigger.dev/sdk', () => ({
  tasks: {
    trigger: jest.fn(),
  },
}));

import { getManifest } from '@trycompai/integration-platform';
import { tasks } from '@trigger.dev/sdk';

const mockedGetManifest = getManifest as jest.MockedFunction<
  typeof getManifest
>;
const mockedTriggerTask = tasks.trigger as jest.MockedFunction<
  typeof tasks.trigger
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
    update: jest.fn(),
  };

  const mockCredentialVaultService = {
    storeOAuthTokens: jest.fn(),
  };

  const mockConnectionService = {
    createConnection: jest.fn(),
    activateConnection: jest.fn(),
  };

  const mockOAuthCredentialsService = {
    checkAvailability: jest.fn(),
    getCredentials: jest.fn(),
  };

  const mockAutoCheckRunnerService = {
    tryAutoRunChecks: jest.fn().mockResolvedValue(false),
  };

  const mockCloudSecurityService = {
    detectServices: jest.fn().mockResolvedValue([]),
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
        {
          provide: CloudSecurityService,
          useValue: mockCloudSecurityService,
        },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(SessionOnlyGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OAuthController>(OAuthController);

    jest.clearAllMocks();
    mockAutoCheckRunnerService.tryAutoRunChecks.mockResolvedValue(false);
    mockCloudSecurityService.detectServices.mockResolvedValue([]);
    mockedTriggerTask.mockResolvedValue({ id: 'run_1' } as never);
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
      await expect(controller.checkAvailability('', 'org_1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('startOAuth', () => {
    it('should throw NOT_FOUND when provider does not exist', async () => {
      mockedGetManifest.mockReturnValue(undefined as never);

      await expect(
        controller.startOAuth('org_1', 'user_1', {
          providerSlug: 'nonexistent',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST when provider is not OAuth', async () => {
      mockedGetManifest.mockReturnValue({
        auth: { type: 'api_key' },
      } as never);

      await expect(
        controller.startOAuth('org_1', 'user_1', {
          providerSlug: 'datadog',
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
        controller.startOAuth('org_1', 'user_1', {
          providerSlug: 'github',
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

      const result = await controller.startOAuth('org_1', 'user_1', {
        providerSlug: 'github',
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

      const result = await controller.startOAuth('org_1', 'user_1', {
        providerSlug: 'linear',
      });

      expect(result.authorizationUrl).toContain('code_challenge=');
      expect(result.authorizationUrl).toContain('code_challenge_method=S256');
    });

    it('should return a GitHub App install URL (state only) for appInstallFlow providers', async () => {
      const manifest = {
        id: 'github-app',
        name: 'GitHub App',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl:
              'https://github.com/apps/{APP_SLUG}/installations/new',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            pkce: false,
            appInstallFlow: true,
            additionalOAuthSettings: [{ id: 'appSlug', token: '{APP_SLUG}' }],
          },
        },
        category: 'Development',
        capabilities: [],
        isActive: true,
      };
      mockedGetManifest.mockReturnValue(manifest as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        scopes: [],
        source: 'platform',
        customSettings: { appSlug: 'comp-ai' },
      });
      mockProviderRepository.upsert.mockResolvedValue(undefined);
      mockOAuthStateRepository.create.mockResolvedValue({
        state: 'state_install',
      });

      const result = await controller.startOAuth('org_1', 'user_1', {
        providerSlug: 'github-app',
      });

      // Install URL with the slug substituted, plus `state` and the
      // environment-specific `redirect_uri` (so multi-callback Apps route back
      // to the right environment).
      expect(result.authorizationUrl).toContain(
        'https://github.com/apps/comp-ai/installations/new',
      );
      expect(result.authorizationUrl).toContain('state=state_install');
      expect(result.authorizationUrl).toContain('redirect_uri=');
      expect(decodeURIComponent(result.authorizationUrl)).toContain(
        '/v1/integrations/oauth/callback',
      );
      // OAuth authorize params must NOT be on an install URL.
      expect(result.authorizationUrl).not.toContain('client_id=');
      expect(result.authorizationUrl).not.toContain('response_type=');
      expect(result.authorizationUrl).not.toContain('scope=');
    });

    it('should throw PRECONDITION_FAILED for an install-flow provider when the app slug is not configured', async () => {
      const manifest = {
        id: 'github-app',
        name: 'GitHub App',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl:
              'https://github.com/apps/{APP_SLUG}/installations/new',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            pkce: false,
            appInstallFlow: true,
            additionalOAuthSettings: [{ id: 'appSlug', token: '{APP_SLUG}' }],
          },
        },
        category: 'Development',
        capabilities: [],
        isActive: true,
      };
      mockedGetManifest.mockReturnValue(manifest as never);
      // No customSettings.appSlug → {APP_SLUG} cannot be resolved.
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        scopes: [],
        source: 'organization',
      });
      mockProviderRepository.upsert.mockResolvedValue(undefined);
      mockOAuthStateRepository.create.mockResolvedValue({ state: 's' });

      await expect(
        controller.startOAuth('org_1', 'user_1', {
          providerSlug: 'github-app',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('oauthCallback', () => {
    const mockResponse = {
      redirect: jest.fn(),
    } as unknown as import('express').Response;

    const buildRequest = (overrides?: Partial<Request['headers']>) =>
      ({
        headers: {
          cookie: 'better-auth.session_token=valid_cookie',
          ...overrides,
        },
      }) as unknown as Request;

    const mockRequest = buildRequest();

    const setMatchingSession = (overrides?: {
      userId?: string;
      activeOrganizationId?: string | null;
    }) => {
      mockedGetSession.mockResolvedValue({
        user: { id: overrides?.userId ?? 'user_1' },
        session: {
          id: 'sess_1',
          activeOrganizationId:
            overrides?.activeOrganizationId === null
              ? undefined
              : (overrides?.activeOrganizationId ?? 'org_1'),
        },
      } as never);
    };

    beforeEach(() => {
      (mockResponse.redirect as jest.Mock).mockClear();
      mockedGetSession.mockReset();
      setMatchingSession();
    });

    it('should redirect with error when OAuth error is present', async () => {
      await controller.oauthCallback(
        {
          code: '',
          state: '',
          error: 'access_denied',
          error_description: 'User denied access',
        },
        mockRequest,
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=access_denied');
    });

    it('should redirect with error when code or state is missing', async () => {
      await controller.oauthCallback(
        { code: '', state: '' },
        mockRequest,
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
        mockRequest,
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
        mockRequest,
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
        mockRequest,
        mockResponse,
      );

      expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
        'valid_state',
      );
      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('error=token_exchange_failed');
    });

    it('should redirect to success URL for GCP without triggering service detection or scan (GCP auto-detection runs after project selection, not after OAuth)', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockOAuthStateRepository.findByState.mockResolvedValue({
        state: 'valid_gcp_state',
        providerSlug: 'gcp',
        organizationId: 'org_1',
        userId: 'user_1',
        codeVerifier: null,
        redirectUrl: null,
        expiresAt: futureDate,
      });
      mockedGetManifest.mockReturnValue({
        id: 'gcp',
        name: 'Google Cloud Platform',
        category: 'Cloud',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
          },
        },
        capabilities: [],
        isActive: true,
      } as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        scopes: ['openid'],
        source: 'platform',
      });
      mockProviderRepository.findBySlug.mockResolvedValue({
        id: 'provider_1',
      });
      mockConnectionRepository.findByProviderAndOrg.mockResolvedValue({
        id: 'conn_1',
        metadata: {},
        variables: {},
        lastSyncAt: null,
      });
      mockConnectionRepository.update.mockResolvedValue({
        id: 'conn_1',
        metadata: {},
        variables: {},
        lastSyncAt: null,
      });
      mockConnectionService.activateConnection.mockResolvedValue({
        id: 'conn_1',
      });

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'access_123' }),
        text: () => Promise.resolve(''),
      } as unknown as Response);

      await controller.oauthCallback(
        { code: 'auth_code', state: 'valid_gcp_state' },
        mockRequest,
        mockResponse,
      );

      await new Promise<void>((resolve) => setImmediate(resolve));

      // GCP service detection / scan is now triggered AFTER the user picks
      // projects on the integrations page, not automatically after OAuth.
      expect(mockCloudSecurityService.detectServices).not.toHaveBeenCalled();
      expect(mockedTriggerTask).not.toHaveBeenCalledWith(
        'run-cloud-security-scan',
        expect.anything(),
      );
      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('success=true');
      expect(redirectUrl).toContain('provider=gcp');

      fetchSpy.mockRestore();
    });

    it('should skip initial GCP service discovery scan when detection already completed', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockOAuthStateRepository.findByState.mockResolvedValue({
        state: 'valid_gcp_state',
        providerSlug: 'gcp',
        organizationId: 'org_1',
        userId: 'user_1',
        codeVerifier: null,
        redirectUrl: null,
        expiresAt: futureDate,
      });
      mockedGetManifest.mockReturnValue({
        id: 'gcp',
        name: 'Google Cloud Platform',
        category: 'Cloud',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
          },
        },
        capabilities: [],
        isActive: true,
      } as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        scopes: ['openid'],
        source: 'platform',
      });
      mockProviderRepository.findBySlug.mockResolvedValue({
        id: 'provider_1',
      });
      mockConnectionRepository.findByProviderAndOrg.mockResolvedValue({
        id: 'conn_1',
        metadata: {},
        variables: {
          serviceDetectionCompletedAt: new Date().toISOString(),
          detectedServices: ['compute-engine'],
        },
        lastSyncAt: null,
      });
      mockConnectionRepository.update.mockResolvedValue({
        id: 'conn_1',
        metadata: {},
        variables: {
          serviceDetectionCompletedAt: new Date().toISOString(),
          detectedServices: ['compute-engine'],
        },
        lastSyncAt: null,
      });
      mockConnectionService.activateConnection.mockResolvedValue({
        id: 'conn_1',
      });

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'access_123' }),
        text: () => Promise.resolve(''),
      } as unknown as Response);

      await controller.oauthCallback(
        { code: 'auth_code', state: 'valid_gcp_state' },
        mockRequest,
        mockResponse,
      );

      expect(mockedTriggerTask).not.toHaveBeenCalledWith(
        'run-cloud-security-scan',
        expect.anything(),
      );
      expect(mockCloudSecurityService.detectServices).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('persists installation_id on the connection for the GitHub App install flow', async () => {
      const futureDate = new Date(Date.now() + 600000);
      mockOAuthStateRepository.findByState.mockResolvedValue({
        state: 'valid_gh_state',
        providerSlug: 'github-app',
        organizationId: 'org_1',
        userId: 'user_1',
        codeVerifier: null,
        redirectUrl: null,
        expiresAt: futureDate,
      });
      mockedGetManifest.mockReturnValue({
        id: 'github-app',
        name: 'GitHub App',
        category: 'Development',
        auth: {
          type: 'oauth2',
          config: {
            authorizeUrl:
              'https://github.com/apps/{APP_SLUG}/installations/new',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            appInstallFlow: true,
          },
        },
        capabilities: [],
        isActive: true,
      } as never);
      mockOAuthCredentialsService.getCredentials.mockResolvedValue({
        clientId: 'client_123',
        clientSecret: 'secret_456',
        scopes: [],
        source: 'platform',
      });
      mockProviderRepository.findBySlug.mockResolvedValue({
        id: 'provider_gh',
      });
      mockConnectionRepository.findByProviderAndOrg.mockResolvedValue({
        id: 'conn_gh',
        metadata: {},
        variables: {},
        lastSyncAt: null,
      });
      mockConnectionRepository.update.mockResolvedValue({
        id: 'conn_gh',
        metadata: {},
        variables: {},
        lastSyncAt: null,
      });
      mockConnectionService.activateConnection.mockResolvedValue({
        id: 'conn_gh',
      });

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ access_token: 'gh_user_token' }),
        text: () => Promise.resolve(''),
      } as unknown as Response);

      await controller.oauthCallback(
        {
          code: 'auth_code',
          state: 'valid_gh_state',
          installation_id: '987654',
          setup_action: 'install',
        },
        mockRequest,
        mockResponse,
      );

      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(mockConnectionRepository.update).toHaveBeenCalledWith(
        'conn_gh',
        expect.objectContaining({
          metadata: expect.objectContaining({
            githubInstallationId: '987654',
            githubSetupAction: 'install',
          }),
        }),
      );
      const redirectUrl = (mockResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('success=true');
      expect(redirectUrl).toContain('provider=github-app');

      fetchSpy.mockRestore();
    });

    describe('session defense-in-depth', () => {
      const futureDate = new Date(Date.now() + 600000);
      const validState = {
        state: 'valid_state',
        providerSlug: 'github',
        organizationId: 'org_1',
        userId: 'user_1',
        codeVerifier: null,
        redirectUrl: null,
        expiresAt: futureDate,
      };

      it('redirects with session_mismatch when no session cookie/auth header is present', async () => {
        mockOAuthStateRepository.findByState.mockResolvedValue(validState);
        const reqWithoutCookie = {
          headers: {},
        } as unknown as Request;

        await controller.oauthCallback(
          { code: 'auth_code', state: 'valid_state' },
          reqWithoutCookie,
          mockResponse,
        );

        // getSession must not even be called when no auth headers are present
        expect(mockedGetSession).not.toHaveBeenCalled();
        expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
          'valid_state',
        );
        const redirectUrl = (mockResponse.redirect as jest.Mock).mock
          .calls[0][0];
        expect(redirectUrl).toContain('error=session_mismatch');
      });

      it('redirects with session_mismatch when getSession returns null', async () => {
        mockOAuthStateRepository.findByState.mockResolvedValue(validState);
        mockedGetSession.mockResolvedValue(null);

        await controller.oauthCallback(
          { code: 'auth_code', state: 'valid_state' },
          mockRequest,
          mockResponse,
        );

        expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
          'valid_state',
        );
        const redirectUrl = (mockResponse.redirect as jest.Mock).mock
          .calls[0][0];
        expect(redirectUrl).toContain('error=session_mismatch');
      });

      it('redirects with session_mismatch when session.user.id does not match oauthState.userId', async () => {
        mockOAuthStateRepository.findByState.mockResolvedValue(validState);
        setMatchingSession({ userId: 'different_user' });

        await controller.oauthCallback(
          { code: 'auth_code', state: 'valid_state' },
          mockRequest,
          mockResponse,
        );

        expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
          'valid_state',
        );
        // We do NOT proceed to token exchange when session doesn't match
        expect(
          mockOAuthCredentialsService.getCredentials,
        ).not.toHaveBeenCalled();
        const redirectUrl = (mockResponse.redirect as jest.Mock).mock
          .calls[0][0];
        expect(redirectUrl).toContain('error=session_mismatch');
      });

      it('redirects with session_mismatch when session.activeOrganizationId is set and does not match oauthState.organizationId', async () => {
        mockOAuthStateRepository.findByState.mockResolvedValue(validState);
        setMatchingSession({ activeOrganizationId: 'org_other' });

        await controller.oauthCallback(
          { code: 'auth_code', state: 'valid_state' },
          mockRequest,
          mockResponse,
        );

        expect(mockOAuthStateRepository.delete).toHaveBeenCalledWith(
          'valid_state',
        );
        const redirectUrl = (mockResponse.redirect as jest.Mock).mock
          .calls[0][0];
        expect(redirectUrl).toContain('error=session_mismatch');
      });

      it('proceeds when session.user.id matches and activeOrganizationId is absent', async () => {
        mockOAuthStateRepository.findByState.mockResolvedValue(validState);
        // Session with userId match but no activeOrganizationId — still allowed,
        // since the state itself already binds the organization.
        setMatchingSession({ activeOrganizationId: null });
        mockedGetManifest.mockReturnValue(undefined as never);

        await controller.oauthCallback(
          { code: 'auth_code', state: 'valid_state' },
          mockRequest,
          mockResponse,
        );

        // Session check passed → we reach the manifest lookup, fail there,
        // redirect with token_exchange_failed (NOT session_mismatch).
        const redirectUrl = (mockResponse.redirect as jest.Mock).mock
          .calls[0][0];
        expect(redirectUrl).toContain('error=token_exchange_failed');
        expect(redirectUrl).not.toContain('error=session_mismatch');
      });
    });
  });
});

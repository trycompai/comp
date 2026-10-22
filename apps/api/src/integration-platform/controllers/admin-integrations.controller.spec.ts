import { GUARDS_METADATA } from '@nestjs/common/constants';

jest.mock('@db', () => ({ db: {} }));

jest.mock('../../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class PlatformAdminGuard {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../interceptors/platform-audit-log.interceptor', () => ({
  PlatformAuditLogInterceptor: class PlatformAuditLogInterceptor {},
}));

jest.mock('@trycompai/integration-platform', () => ({
  getAllManifests: jest.fn(() => [
    {
      id: 'github',
      name: 'GitHub',
      description: 'GitHub',
      category: 'Development',
      logoUrl: 'https://example.com/github.png',
      auth: {
        type: 'oauth2',
        config: {
          setupInstructions: 'steps',
          createAppUrl: 'https://example.com/new',
          scopes: ['repo'],
          authorizeUrl: 'https://example.com/authorize',
        },
      },
      capabilities: ['checks'],
      isActive: true,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Slack',
      category: 'Communication',
      logoUrl: 'https://example.com/slack.png',
      auth: { type: 'oauth2', config: { scopes: [] } },
      capabilities: ['checks'],
      isActive: true,
    },
  ]),
  getManifest: jest.fn(),
}));

import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import type { PlatformCredentialRepository } from '../repositories/platform-credential.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import type { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AdminIntegrationsController } from './admin-integrations.controller';

describe('AdminIntegrationsController', () => {
  const originalKey = process.env.ENCRYPTION_KEY;
  const findAll = jest.fn();
  const vault = new CredentialVaultService(
    {} as ConstructorParameters<typeof CredentialVaultService>[0],
    {} as ConstructorParameters<typeof CredentialVaultService>[1],
  );
  const controller = new AdminIntegrationsController(
    {} as OAuthCredentialsService,
    { findAll } as unknown as PlatformCredentialRepository,
    vault,
  );

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.ENCRYPTION_KEY;
      return;
    }
    process.env.ENCRYPTION_KEY = originalKey;
  });

  beforeEach(() => {
    findAll.mockReset();
  });

  it('is restricted to platform admins', () => {
    const guards: unknown[] = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminIntegrationsController,
    );

    expect(guards).toEqual([PlatformAdminGuard]);
  });

  it('returns client credentials for configured providers', async () => {
    findAll.mockResolvedValue([
      {
        providerSlug: 'github',
        encryptedClientId: await vault.encrypt('client-id-value'),
        encryptedClientSecret: await vault.encrypt('client-secret-value'),
        clientIdHint: 'clie',
        clientSecretHint: 'alue',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      },
    ]);

    const result = await controller.listIntegrations();
    const github = result.find((item) => item.id === 'github');
    const slack = result.find((item) => item.id === 'slack');

    expect(github).toMatchObject({
      hasCredentials: true,
      clientId: 'client-id-value',
      clientSecret: 'client-secret-value',
    });
    expect(slack).toMatchObject({
      hasCredentials: false,
      clientId: null,
      clientSecret: null,
    });
    for (const item of result) {
      expect(item).not.toHaveProperty('encryptedClientId');
      expect(item).not.toHaveProperty('encryptedClientSecret');
    }
  });

  it('returns null credentials when stored values cannot be read', async () => {
    findAll.mockResolvedValue([
      {
        providerSlug: 'github',
        encryptedClientId: { encrypted: 'x', iv: 'x', tag: 'x', salt: 'x' },
        encryptedClientSecret: { encrypted: 'x', iv: 'x', tag: 'x', salt: 'x' },
      },
    ]);

    const result = await controller.listIntegrations();

    expect(result.find((item) => item.id === 'github')).toMatchObject({
      hasCredentials: true,
      clientId: null,
      clientSecret: null,
    });
  });
});

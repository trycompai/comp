jest.mock('@db', () => ({
  db: {},
}));

import { CredentialVaultService } from './credential-vault.service';
import { CredentialRepository } from '../repositories/credential.repository';
import { ConnectionRepository } from '../repositories/connection.repository';
import type { IntegrationConnection, IntegrationCredentialVersion } from '@db';

const encrypted = (value: string) => ({
  encrypted: value,
  iv: 'iv',
  tag: 'tag',
  salt: 'salt',
});

const makeConnection = (): IntegrationConnection => ({
  id: 'conn_1',
  providerId: 'prv_1',
  organizationId: 'org_1',
  status: 'active',
  authStrategy: 'oauth2',
  activeCredentialVersionId: 'cred_1',
  lastSyncAt: null,
  nextSyncAt: null,
  syncCadence: null,
  metadata: {},
  variables: {},
  errorMessage: null,
  refreshLeaseUntil: null,
  refreshLeaseToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

const makeCredentialVersion = (): IntegrationCredentialVersion => ({
  id: 'cred_1',
  connectionId: 'conn_1',
  encryptedPayload: {},
  version: 1,
  expiresAt: null,
  rotatedAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('CredentialVaultService Google OAuth token storage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves an existing refresh token when a new OAuth response omits one', async () => {
    const credentialRepository = new CredentialRepository();
    const connectionRepository = new ConnectionRepository();
    const createSpy = jest
      .spyOn(credentialRepository, 'create')
      .mockResolvedValue(makeCredentialVersion());
    jest.spyOn(credentialRepository, 'deleteOldVersions').mockResolvedValue(0);
    jest
      .spyOn(connectionRepository, 'update')
      .mockResolvedValue(makeConnection());
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest.spyOn(service, 'getRefreshToken').mockResolvedValue('stored-refresh');
    jest.spyOn(service, 'encrypt').mockImplementation(async (value) => {
      return encrypted(value);
    });

    await service.storeOAuthTokens(
      'conn_1',
      {
        access_token: 'new-access',
        expires_in: 3600,
        token_type: 'Bearer',
      },
      { preserveExistingRefreshToken: true },
    );

    const firstCreateCall = createSpy.mock.calls[0];
    if (!firstCreateCall) {
      throw new Error('Expected credential version to be created');
    }
    const [createInput] = firstCreateCall;

    expect(createInput.encryptedPayload).toMatchObject({
      refresh_token: encrypted('stored-refresh'),
      access_token: encrypted('new-access'),
    });
  });

  it('does not preserve an old refresh token unless explicitly requested', async () => {
    const credentialRepository = new CredentialRepository();
    const connectionRepository = new ConnectionRepository();
    const createSpy = jest
      .spyOn(credentialRepository, 'create')
      .mockResolvedValue(makeCredentialVersion());
    jest.spyOn(credentialRepository, 'deleteOldVersions').mockResolvedValue(0);
    jest
      .spyOn(connectionRepository, 'update')
      .mockResolvedValue(makeConnection());
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    const refreshTokenSpy = jest
      .spyOn(service, 'getRefreshToken')
      .mockResolvedValue('stored-refresh');
    jest.spyOn(service, 'encrypt').mockImplementation(async (value) => {
      return encrypted(value);
    });

    await service.storeOAuthTokens('conn_1', {
      access_token: 'new-access',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    const firstCreateCall = createSpy.mock.calls[0];
    if (!firstCreateCall) {
      throw new Error('Expected credential version to be created');
    }
    const [createInput] = firstCreateCall;

    expect(refreshTokenSpy).not.toHaveBeenCalled();
    expect(createInput.encryptedPayload).not.toHaveProperty('refresh_token');
  });

  it('fails closed when refresh-token preservation cannot be verified', async () => {
    const credentialRepository = new CredentialRepository();
    const connectionRepository = new ConnectionRepository();
    const createSpy = jest.spyOn(credentialRepository, 'create');
    const updateSpy = jest.spyOn(connectionRepository, 'update');
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest
      .spyOn(service, 'getRefreshToken')
      .mockRejectedValue(new Error('decrypt failed'));
    jest.spyOn(service, 'encrypt').mockImplementation(async (value) => {
      return encrypted(value);
    });

    await expect(
      service.storeOAuthTokens(
        'conn_1',
        {
          access_token: 'new-access',
          expires_in: 3600,
          token_type: 'Bearer',
        },
        { preserveExistingRefreshToken: true },
      ),
    ).rejects.toThrow(
      'Unable to preserve existing refresh token for connection conn_1: decrypt failed',
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

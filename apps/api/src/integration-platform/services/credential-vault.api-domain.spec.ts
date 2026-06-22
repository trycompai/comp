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

const buildService = () => {
  const credentialRepository = new CredentialRepository();
  const connectionRepository = new ConnectionRepository();
  const createSpy = jest
    .spyOn(credentialRepository, 'create')
    .mockResolvedValue(makeCredentialVersion());
  jest.spyOn(credentialRepository, 'deleteOldVersions').mockResolvedValue(0);
  jest.spyOn(connectionRepository, 'update').mockResolvedValue(makeConnection());
  const service = new CredentialVaultService(
    credentialRepository,
    connectionRepository,
  );
  jest
    .spyOn(service, 'encrypt')
    .mockImplementation(async (value) => encrypted(value));
  return { service, createSpy };
};

describe('CredentialVaultService multi-DC api_domain handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('captures api_domain from a token response and stores it in plaintext', async () => {
    const { service, createSpy } = buildService();
    // When the response carries api_domain we must not need the stored value.
    const getCredsSpy = jest.spyOn(service, 'getDecryptedCredentials');

    await service.storeOAuthTokens('conn_1', {
      access_token: 'zoho-access',
      refresh_token: 'zoho-refresh',
      expires_in: 3600,
      token_type: 'Bearer',
      api_domain: 'https://www.zohoapis.eu',
    });

    const createInput = createSpy.mock.calls[0]?.[0];
    if (!createInput) throw new Error('Expected credential version to be created');

    // Stored as a plaintext string (not encrypted) so the check runtime can
    // read it as ctx.credentials.api_domain and route to the right region.
    expect(createInput.encryptedPayload.api_domain).toBe(
      'https://www.zohoapis.eu',
    );
    // Secrets are still encrypted.
    expect(createInput.encryptedPayload.access_token).toEqual(
      encrypted('zoho-access'),
    );
    // No need to read the prior credential when the response already has it.
    expect(getCredsSpy).not.toHaveBeenCalled();
  });

  it('preserves an existing api_domain when a refresh response omits it', async () => {
    const { service, createSpy } = buildService();
    jest
      .spyOn(service, 'getDecryptedCredentials')
      .mockResolvedValue({ api_domain: 'https://www.zohoapis.in' });

    // A refresh response that does not echo api_domain.
    await service.storeOAuthTokens('conn_1', {
      access_token: 'refreshed-access',
      refresh_token: 'zoho-refresh',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    const createInput = createSpy.mock.calls[0]?.[0];
    if (!createInput) throw new Error('Expected credential version to be created');

    expect(createInput.encryptedPayload.api_domain).toBe(
      'https://www.zohoapis.in',
    );
  });

  it('stores no api_domain for providers that never send one (backward compatible)', async () => {
    const { service, createSpy } = buildService();
    // Typical single-DC provider: nothing in the response, nothing stored.
    jest.spyOn(service, 'getDecryptedCredentials').mockResolvedValue({});

    await service.storeOAuthTokens('conn_1', {
      access_token: 'github-access',
      refresh_token: 'github-refresh',
      expires_in: 3600,
      token_type: 'Bearer',
    });

    const createInput = createSpy.mock.calls[0]?.[0];
    if (!createInput) throw new Error('Expected credential version to be created');

    expect(createInput.encryptedPayload).not.toHaveProperty('api_domain');
  });

  it('does not fail token storage if the prior api_domain cannot be read', async () => {
    const { service, createSpy } = buildService();
    jest
      .spyOn(service, 'getDecryptedCredentials')
      .mockRejectedValue(new Error('decrypt failed'));

    await expect(
      service.storeOAuthTokens('conn_1', {
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    ).resolves.toBeUndefined();

    const createInput = createSpy.mock.calls[0]?.[0];
    if (!createInput) throw new Error('Expected credential version to be created');
    expect(createInput.encryptedPayload).not.toHaveProperty('api_domain');
  });
});

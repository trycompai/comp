jest.mock('@db', () => ({
  db: {},
}));

import { CredentialVaultService } from './credential-vault.service';
import { CredentialRepository } from '../repositories/credential.repository';
import { ConnectionRepository } from '../repositories/connection.repository';
import type { IntegrationConnection } from '@db';

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

describe('CredentialVaultService Google OAuth refresh handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not send scope when refreshing Google OAuth tokens', async () => {
    const credentialRepository = new CredentialRepository();
    const connectionRepository = new ConnectionRepository();
    jest
      .spyOn(credentialRepository, 'findLatestByConnection')
      .mockResolvedValue(null);
    jest
      .spyOn(connectionRepository, 'acquireRefreshLease')
      .mockResolvedValue(true);
    jest
      .spyOn(connectionRepository, 'releaseRefreshLease')
      .mockResolvedValue(undefined);
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest.spyOn(service, 'getRefreshToken').mockResolvedValue('refresh-token');
    jest.spyOn(service, 'storeOAuthTokens').mockResolvedValue(undefined);

    let requestBody: BodyInit | null | undefined;
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      requestBody = init?.body;
      return new Response(
        JSON.stringify({
          access_token: 'new-access',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const token = await service.refreshOAuthTokens('conn_1', {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      clientAuthMethod: 'body',
      scope:
        'openid email profile https://www.googleapis.com/auth/cloud-platform',
    });

    expect(token).toBe('new-access');
    if (typeof requestBody !== 'string') {
      throw new Error('Expected OAuth refresh body to be serialized');
    }

    const params = new URLSearchParams(requestBody);
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('refresh_token')).toBe('refresh-token');
    expect(params.get('client_id')).toBe('client-id');
    expect(params.get('client_secret')).toBe('client-secret');
    expect(params.has('scope')).toBe(false);
  });

  it('marks the connection as reconnect-required when no refresh token exists', async () => {
    const credentialRepository = new CredentialRepository();
    const connectionRepository = new ConnectionRepository();
    jest
      .spyOn(credentialRepository, 'findLatestByConnection')
      .mockResolvedValue(null);
    jest
      .spyOn(connectionRepository, 'acquireRefreshLease')
      .mockResolvedValue(true);
    jest
      .spyOn(connectionRepository, 'releaseRefreshLease')
      .mockResolvedValue(undefined);
    jest
      .spyOn(connectionRepository, 'update')
      .mockResolvedValue(makeConnection());
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest.spyOn(service, 'getRefreshToken').mockResolvedValue(null);
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const token = await service.refreshOAuthTokens('conn_1', {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      clientAuthMethod: 'body',
    });

    expect(token).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(connectionRepository.update).toHaveBeenCalledWith('conn_1', {
      status: 'error',
      errorMessage:
        'OAuth refresh token missing. Please reconnect the integration.',
    });
  });

  it('stores a specific Google session-control error when refresh returns invalid_rapt', async () => {
    const credentialRepository = new CredentialRepository();
    const connectionRepository = new ConnectionRepository();
    jest
      .spyOn(credentialRepository, 'findLatestByConnection')
      .mockResolvedValue(null);
    jest
      .spyOn(connectionRepository, 'acquireRefreshLease')
      .mockResolvedValue(true);
    jest
      .spyOn(connectionRepository, 'releaseRefreshLease')
      .mockResolvedValue(undefined);
    jest
      .spyOn(connectionRepository, 'update')
      .mockResolvedValue(makeConnection());
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest.spyOn(service, 'getRefreshToken').mockResolvedValue('refresh-token');
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'invalid_grant',
            error_description: 'reauth related error',
            error_subtype: 'invalid_rapt',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const token = await service.refreshOAuthTokens('conn_1', {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      clientAuthMethod: 'body',
    });

    expect(token).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(connectionRepository.update).toHaveBeenCalledWith('conn_1', {
      status: 'error',
      errorMessage:
        'Google requires user reauthentication because of session-control policy (invalid_rapt). Please reconnect the integration.',
    });
  });
});

jest.mock('@db', () => ({
  db: {},
}));

import { CredentialVaultService } from './credential-vault.service';
import type { CredentialRepository } from '../repositories/credential.repository';
import type { ConnectionRepository } from '../repositories/connection.repository';

type DelayInternal = { delay: (ms: number) => Promise<void> };

describe('CredentialVaultService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not let tokenParams override reserved OAuth refresh parameters', async () => {
    const credentialRepository = {
      findLatestByConnection: jest.fn().mockResolvedValue(null),
    } as unknown as CredentialRepository;
    const connectionRepository = {
      acquireRefreshLease: jest.fn().mockResolvedValue(true),
      releaseRefreshLease: jest.fn().mockResolvedValue(undefined),
    } as unknown as ConnectionRepository;
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest.spyOn(service, 'getRefreshToken').mockResolvedValue('real-refresh');
    jest.spyOn(service, 'storeOAuthTokens').mockResolvedValue(undefined);

    let requestBody: BodyInit | null | undefined;
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      requestBody = init?.body;
      return new Response(
        JSON.stringify({
          access_token: 'new-token',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const token = await service.refreshOAuthTokens('conn_1', {
      tokenUrl: 'https://oauth.example.com/token',
      clientId: 'real-client',
      clientSecret: 'real-secret',
      clientAuthMethod: 'body',
      scope: 'real-scope',
      tokenParams: {
        grant_type: 'client_credentials',
        refresh_token: 'wrong-refresh',
        client_id: 'wrong-client',
        client_secret: 'wrong-secret',
        scope: 'wrong-scope',
        audience: 'https://api.example.com',
      },
    });

    expect(token).toBe('new-token');
    expect(connectionRepository.acquireRefreshLease).toHaveBeenCalledWith(
      'conn_1',
      expect.any(Number),
    );
    expect(connectionRepository.releaseRefreshLease).toHaveBeenCalledWith(
      'conn_1',
    );

    if (typeof requestBody !== 'string') {
      throw new Error('Expected OAuth refresh body to be serialized');
    }

    const params = new URLSearchParams(requestBody);
    expect(params.get('grant_type')).toBe('refresh_token');
    expect(params.get('refresh_token')).toBe('real-refresh');
    expect(params.get('client_id')).toBe('real-client');
    expect(params.get('client_secret')).toBe('real-secret');
    expect(params.get('scope')).toBe('real-scope');
    expect(params.get('audience')).toBe('https://api.example.com');
  });

  it('coalesces concurrent refreshes: when the lease is held, it reuses the peer token without calling the provider', async () => {
    // A peer is already refreshing → we cannot acquire the lease.
    const credentialRepository = {
      // Peer stored a fresh version after this call began.
      findLatestByConnection: jest.fn().mockResolvedValue({
        createdAt: new Date(Date.now() + 60_000),
      }),
    } as unknown as CredentialRepository;
    const connectionRepository = {
      acquireRefreshLease: jest.fn().mockResolvedValue(false),
      releaseRefreshLease: jest.fn().mockResolvedValue(undefined),
    } as unknown as ConnectionRepository;
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    // Don't actually wait between polls.
    jest
      .spyOn(service as unknown as DelayInternal, 'delay')
      .mockResolvedValue(undefined);
    jest
      .spyOn(service, 'getDecryptedCredentials')
      .mockResolvedValue({ access_token: 'peer-token' });
    const refreshTokenSpy = jest.spyOn(service, 'getRefreshToken');
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const token = await service.refreshOAuthTokens('conn_1', {
      tokenUrl: 'https://oauth.example.com/token',
      clientId: 'c',
      clientSecret: 's',
      clientAuthMethod: 'body',
    });

    expect(token).toBe('peer-token');
    // No duplicate refresh against the provider.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(refreshTokenSpy).not.toHaveBeenCalled();
    // We never held the lease, so we must not release it.
    expect(connectionRepository.releaseRefreshLease).not.toHaveBeenCalled();
  });

  it('always releases the lease, even when the refresh fails', async () => {
    const credentialRepository = {
      findLatestByConnection: jest.fn().mockResolvedValue(null),
    } as unknown as CredentialRepository;
    const connectionRepository = {
      acquireRefreshLease: jest.fn().mockResolvedValue(true),
      releaseRefreshLease: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as ConnectionRepository;
    const service = new CredentialVaultService(
      credentialRepository,
      connectionRepository,
    );

    jest.spyOn(service, 'getRefreshToken').mockResolvedValue('real-refresh');
    // Provider rejects the refresh on both attempts. Return a fresh Response per
    // call — a Response body can only be read once.
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    jest
      .spyOn(service as unknown as DelayInternal, 'delay')
      .mockResolvedValue(undefined);

    const token = await service.refreshOAuthTokens('conn_1', {
      tokenUrl: 'https://oauth.example.com/token',
      clientId: 'c',
      clientSecret: 's',
      clientAuthMethod: 'body',
    });

    expect(token).toBeNull();
    expect(connectionRepository.releaseRefreshLease).toHaveBeenCalledWith(
      'conn_1',
    );
  });
});

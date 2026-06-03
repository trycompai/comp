jest.mock('@db', () => ({
  db: {},
}));

import { CredentialVaultService } from './credential-vault.service';
import type { CredentialRepository } from '../repositories/credential.repository';
import type { ConnectionRepository } from '../repositories/connection.repository';

describe('CredentialVaultService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not let tokenParams override reserved OAuth refresh parameters', async () => {
    const credentialRepository = {} as unknown as CredentialRepository;
    const connectionRepository = {} as unknown as ConnectionRepository;
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
});

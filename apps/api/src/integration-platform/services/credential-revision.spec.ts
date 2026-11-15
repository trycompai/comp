jest.mock('@db', () => ({ db: {} }));

import { CredentialVaultService } from './credential-vault.service';
import type { CredentialRepository } from '../repositories/credential.repository';
import type { ConnectionRepository } from '../repositories/connection.repository';

describe('completion evidence uses the actual decrypted credential revision', () => {
  const findConnection = jest.fn();
  const findVersion = jest.fn();
  const findLatest = jest.fn();
  const credentials = {
    roleArn: 'synthetic-role',
    regions: ['synthetic-region'],
  };
  let service: CredentialVaultService;
  beforeEach(() => {
    jest.clearAllMocks();
    findConnection.mockResolvedValue({
      activeCredentialVersionId: 'selected-revision',
    });
    findVersion.mockResolvedValue({
      id: 'selected-revision',
      encryptedPayload: credentials,
    });
    findLatest.mockResolvedValue({
      id: 'fallback-revision',
      encryptedPayload: credentials,
    });
    service = new CredentialVaultService(
      {
        findById: findVersion,
        findLatestByConnection: findLatest,
      } as unknown as CredentialRepository,
      { findById: findConnection } as unknown as ConnectionRepository,
    );
  });
  it('returns the opaque revision of the record it actually decrypted', async () => {
    expect(
      await service.getDecryptedCredentialsWithRevision({
        connectionId: 'connection',
      }),
    ).toEqual({ credentials, credentialRevision: 'selected-revision' });
    expect(findVersion).toHaveBeenCalledWith('selected-revision');
    expect(findLatest).not.toHaveBeenCalled();
  });
  it('returns the real fallback revision when the active reference is unavailable', async () => {
    findVersion.mockResolvedValue(null);
    expect(
      await service.getDecryptedCredentialsWithRevision({
        connectionId: 'connection',
      }),
    ).toEqual({ credentials, credentialRevision: 'fallback-revision' });
  });
  it('does not stamp a newly rotated pointer onto an older decrypted record', async () => {
    const connection = { activeCredentialVersionId: 'selected-revision' };
    findConnection.mockResolvedValue(connection);
    findVersion.mockImplementation(() => {
      connection.activeCredentialVersionId = 'rotated-revision';
      return Promise.resolve({
        id: 'selected-revision',
        encryptedPayload: credentials,
      });
    });
    expect(
      await service.getDecryptedCredentialsWithRevision({
        connectionId: 'connection',
      }),
    ).toEqual({ credentials, credentialRevision: 'selected-revision' });
  });
  it('preserves the legacy credentials-only return contract', async () => {
    expect(await service.getDecryptedCredentials('connection')).toEqual(
      credentials,
    );
  });
  it('does not invent a revision when no credentials exist', async () => {
    findVersion.mockResolvedValue(null);
    findLatest.mockResolvedValue(null);
    expect(
      await service.getDecryptedCredentialsWithRevision({
        connectionId: 'connection',
      }),
    ).toBeNull();
  });
});

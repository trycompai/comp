import { OnePasswordCredentialVaultAdapter } from './onepassword-credential-vault.adapter';
import {
  getOnePasswordClient,
  type OnePasswordClient,
} from './onepassword-client';

jest.mock('./onepassword-client', () => ({
  getOnePasswordClient: jest.fn(),
}));

const mockedGetClient = jest.mocked(getOnePasswordClient);

function clientWith(
  resolve: jest.Mock,
  itemsGet?: jest.Mock,
): OnePasswordClient {
  return {
    secrets: { resolve },
    items: {
      get: itemsGet ?? jest.fn().mockRejectedValue(new Error('no items')),
    },
  } as unknown as OnePasswordClient;
}

describe('OnePasswordCredentialVaultAdapter', () => {
  const adapter = new OnePasswordCredentialVaultAdapter();

  beforeEach(() => jest.clearAllMocks());

  it('returns null (and never touches 1Password) when provider is not 1password', async () => {
    const result = await adapter.resolveCredentialReference({
      profileId: 'bap_1',
      provider: 'lastpass',
      externalItemRef: 'op://v/i',
    });

    expect(result).toBeNull();
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('returns null when the item reference is missing', async () => {
    const result = await adapter.resolveCredentialReference({
      profileId: 'bap_1',
      provider: '1password',
      externalItemRef: '   ',
    });

    expect(result).toBeNull();
    expect(mockedGetClient).not.toHaveBeenCalled();
  });

  it('resolves username, password, and the live TOTP code', async () => {
    const resolve = jest.fn((reference: string) => {
      if (reference.endsWith('/username')) return 'alice@example.com';
      if (reference.endsWith('/password')) return 's3cret';
      if (reference.includes('one-time password')) return '123456';
      throw new Error(`unexpected reference: ${reference}`);
    });
    mockedGetClient.mockResolvedValue(clientWith(resolve));

    const result = await adapter.resolveCredentialReference({
      profileId: 'bap_1',
      provider: '1password',
      externalItemRef: 'op://vault123/item456',
    });

    expect(result).toEqual({
      username: 'alice@example.com',
      password: 's3cret',
      totpCode: '123456',
    });
    expect(resolve).toHaveBeenCalledWith(
      'op://vault123/item456/one-time password?attribute=otp',
    );
  });

  it('treats a missing TOTP field as absent rather than failing', async () => {
    const resolve = jest.fn((reference: string) => {
      if (reference.endsWith('/username')) return 'alice';
      if (reference.endsWith('/password')) return 'pw';
      throw new Error('field not found');
    });
    mockedGetClient.mockResolvedValue(clientWith(resolve));

    const result = await adapter.resolveCredentialReference({
      profileId: 'bap_1',
      provider: '1password',
      externalItemRef: 'op://v/i',
    });

    expect(result).toEqual({
      username: 'alice',
      password: 'pw',
      totpCode: undefined,
    });
  });

  it('returns null when no fields resolve', async () => {
    const resolve = jest.fn(() => {
      throw new Error('nothing here');
    });
    mockedGetClient.mockResolvedValue(clientWith(resolve));

    const result = await adapter.resolveCredentialReference({
      profileId: 'bap_1',
      provider: '1password',
      externalItemRef: 'op://v/i',
    });

    expect(result).toBeNull();
  });

  it('resolves extra custom fields, ignoring the reserved login fields', async () => {
    const resolve = jest.fn((reference: string) => {
      if (reference.endsWith('/username')) return 'alice';
      if (reference.endsWith('/password')) return 'pw';
      throw new Error('no totp');
    });
    const itemsGet = jest.fn().mockResolvedValue({
      fields: [
        { title: 'username', value: 'alice' },
        { title: 'password', value: 'pw' },
        { title: 'one-time password', value: 'seed' },
        { title: 'Workspace URL', value: 'acme.example.com' },
        { title: 'Empty', value: '   ' },
      ],
    });
    mockedGetClient.mockResolvedValue(clientWith(resolve, itemsGet));

    const result = await adapter.resolveCredentialReference({
      profileId: 'bap_1',
      provider: '1password',
      externalItemRef: 'op://vault123/item456',
    });

    expect(itemsGet).toHaveBeenCalledWith('vault123', 'item456');
    expect(result?.extraFields).toEqual([
      { label: 'Workspace URL', value: 'acme.example.com' },
    ]);
  });
});

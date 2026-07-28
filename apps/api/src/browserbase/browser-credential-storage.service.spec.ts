import { BadRequestException } from '@nestjs/common';
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import * as opClient from './onepassword-client';
import { TOTP_FIELD_TITLE, buildItemReference } from './onepassword-credential-item';

jest.mock('@db', () => ({
  db: {
    browserAuthProfile: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));
jest.mock('./onepassword-client');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require('@db');
const findFirst = db.browserAuthProfile.findFirst as jest.Mock;
const update = db.browserAuthProfile.update as jest.Mock;
const findMany = db.browserAuthProfile.findMany as jest.Mock;

const mockConfigured = opClient.isOnePasswordConfigured as jest.Mock;
const mockGetClient = opClient.getOnePasswordClient as jest.Mock;
const mockLoadModule = opClient.loadOnePasswordModule as jest.Mock;

const REF = buildItemReference('vault-1', 'item-1');

interface Field {
  id: string;
  title: string;
  fieldType: string;
  value: string;
}

const field = (title: string, value = 'x'): Field => ({
  id: title,
  title,
  fieldType: 'Text',
  value,
});

describe('BrowserCredentialStorageService — TOTP', () => {
  let service: BrowserCredentialStorageService;
  let itemsGet: jest.Mock;
  let itemsPut: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BrowserCredentialStorageService();
    mockConfigured.mockReturnValue(true);
    mockLoadModule.mockResolvedValue({ ItemFieldType: { Totp: 'Totp' } });
    itemsGet = jest.fn();
    itemsPut = jest.fn().mockResolvedValue(undefined);
    mockGetClient.mockResolvedValue({ items: { get: itemsGet, put: itemsPut } });
  });

  const profile = (overrides: Record<string, unknown> = {}) => ({
    id: 'bap_1',
    organizationId: 'org_1',
    vaultExternalItemRef: REF,
    ...overrides,
  });

  describe('getProfileTotpStatus', () => {
    it('is configured when the item has a non-empty TOTP field', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({
        fields: [field('username'), field(TOTP_FIELD_TITLE, 'SEED')],
      });

      const result = await service.getProfileTotpStatus({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });

      expect(result).toEqual({ configured: true });
    });

    it('is not configured when there is no TOTP field', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({ fields: [field('username'), field('password')] });

      const result = await service.getProfileTotpStatus({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });

      expect(result).toEqual({ configured: false });
    });

    it('is not configured when the connection has no stored login', async () => {
      findFirst.mockResolvedValue(profile({ vaultExternalItemRef: null }));

      const result = await service.getProfileTotpStatus({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });

      expect(result).toEqual({ configured: false });
      expect(itemsGet).not.toHaveBeenCalled();
    });
  });

  describe('getOrgTotpStatuses', () => {
    it('reports configured per connection and omits an unreadable item (not "off")', async () => {
      findMany.mockResolvedValue([
        { id: 'bap_1', vaultExternalItemRef: buildItemReference('v', 'i1') },
        { id: 'bap_2', vaultExternalItemRef: buildItemReference('v', 'i2') },
        { id: 'bap_3', vaultExternalItemRef: buildItemReference('v', 'i3') },
      ]);
      itemsGet.mockImplementation((_vaultId: string, itemId: string) => {
        if (itemId === 'i1')
          return Promise.resolve({ fields: [field(TOTP_FIELD_TITLE, 'SEED')] });
        if (itemId === 'i2')
          return Promise.resolve({ fields: [field('username')] });
        return Promise.reject(new Error('unreadable')); // one bad item must not fail the batch
      });

      const result = await service.getOrgTotpStatuses('org_1');

      // bap_3 is absent, not false — the UI shows it as "unknown", never at-risk.
      expect(result).toEqual({ bap_1: true, bap_2: false });
      expect('bap_3' in result).toBe(false);
    });

    it('returns {} when the org has no password connections', async () => {
      findMany.mockResolvedValue([]);

      const result = await service.getOrgTotpStatuses('org_1');

      expect(result).toEqual({});
      expect(itemsGet).not.toHaveBeenCalled();
    });
  });

  describe('setProfileTotp', () => {
    it('replaces any existing TOTP field and writes the item back', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({
        fields: [field('username'), field(TOTP_FIELD_TITLE, 'OLD')],
      });

      const result = await service.setProfileTotp({
        organizationId: 'org_1',
        profileId: 'bap_1',
        totpSeed: '  jbsw y3dp ehpk 3pxp  ',
      });

      expect(result).toEqual({ configured: true });
      const written = itemsPut.mock.calls[0][0];
      const totpFields = written.fields.filter(
        (f: Field) => f.title === TOTP_FIELD_TITLE,
      );
      expect(totpFields).toHaveLength(1);
      // Stored normalized (formatting stripped, upper-cased) — the Base32 secret.
      expect(totpFields[0]).toMatchObject({
        fieldType: 'Totp',
        value: 'JBSWY3DPEHPK3PXP',
      });
    });

    it('accepts an otpauth:// URI verbatim', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({ fields: [field('username')] });
      const uri = 'otpauth://totp/Acme:alice?secret=JBSWY3DPEHPK3PXP&issuer=Acme';

      await service.setProfileTotp({
        organizationId: 'org_1',
        profileId: 'bap_1',
        totpSeed: uri,
      });

      const written = itemsPut.mock.calls[0][0];
      const totp = written.fields.find((f: Field) => f.title === TOTP_FIELD_TITLE);
      expect(totp.value).toBe(uri);
    });

    it('rejects a rotating one-time code (would break unattended 2FA)', async () => {
      await expect(
        service.setProfileTotp({
          organizationId: 'org_1',
          profileId: 'bap_1',
          totpSeed: '123 456',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      // Rejected before touching the vault or the DB.
      expect(itemsGet).not.toHaveBeenCalled();
      expect(itemsPut).not.toHaveBeenCalled();
    });

    it('rejects a malformed / too-short key', async () => {
      await expect(
        service.setProfileTotp({
          organizationId: 'org_1',
          profileId: 'bap_1',
          totpSeed: 'not-a-real-key!!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(itemsPut).not.toHaveBeenCalled();
    });

    it('rejects when the connection has no stored login', async () => {
      findFirst.mockResolvedValue(profile({ vaultExternalItemRef: null }));

      await expect(
        service.setProfileTotp({
          organizationId: 'org_1',
          profileId: 'bap_1',
          totpSeed: 'JBSWY3DPEHPK3PXP', // valid seed → reaches the no-login check
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(itemsPut).not.toHaveBeenCalled();
    });
  });

  describe('storeProfileCredentials — identifier label', () => {
    it('persists the detected identifier label (trimmed) on the profile', async () => {
      findFirst.mockResolvedValue({
        id: 'bap_1',
        organizationId: 'org_1',
        displayName: 'GitHub',
        hostname: 'github.com',
      });
      update.mockResolvedValue({});
      mockGetClient.mockResolvedValue({
        vaults: {
          list: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'vault-1' }),
        },
        items: { create: jest.fn().mockResolvedValue({ id: 'item-1' }) },
      });
      mockLoadModule.mockResolvedValue({
        ItemCategory: { Login: 'Login' },
        ItemFieldType: { Text: 'Text', Concealed: 'Concealed', Totp: 'Totp' },
      });

      await service.storeProfileCredentials({
        organizationId: 'org_1',
        profileId: 'bap_1',
        username: 'ci-bot',
        password: 'secret',
        usernameLabel: '  IAM username  ',
      });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ identifierLabel: 'IAM username' }),
        }),
      );
    });
  });

  describe('storeProfileCredentials — re-save with an existing item', () => {
    let itemsCreate: jest.Mock;

    const storedProfile = () =>
      profile({ displayName: 'GitHub', hostname: 'github.com' });

    beforeEach(() => {
      itemsCreate = jest.fn().mockResolvedValue({ id: 'item-2' });
      mockGetClient.mockResolvedValue({
        vaults: {
          list: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({ id: 'vault-2' }),
        },
        items: { get: itemsGet, put: itemsPut, create: itemsCreate },
      });
      mockLoadModule.mockResolvedValue({
        ItemCategory: { Login: 'Login' },
        ItemFieldType: { Text: 'Text', Concealed: 'Concealed', Totp: 'Totp' },
      });
      update.mockResolvedValue({});
    });

    it('updates the existing item in place instead of creating an orphan', async () => {
      findFirst.mockResolvedValue(storedProfile());
      itemsGet.mockResolvedValue({
        title: 'old title',
        fields: [field('username', 'old-user'), field('password', 'old-pass')],
      });

      await service.storeProfileCredentials({
        organizationId: 'org_1',
        profileId: 'bap_1',
        username: 'new-user',
        password: 'new-pass',
      });

      expect(itemsCreate).not.toHaveBeenCalled();
      const written = itemsPut.mock.calls[0][0];
      expect(written.title).toBe('GitHub (github.com)');
      expect(
        written.fields.find((f: Field) => f.title === 'username')?.value,
      ).toBe('new-user');
      expect(
        written.fields.find((f: Field) => f.title === 'password')?.value,
      ).toBe('new-pass');
      // The op:// reference is stable — the update must not repoint it.
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            vaultExternalItemRef: expect.anything(),
          }),
        }),
      );
    });

    it('keeps the stored TOTP seed when the re-save has no new one', async () => {
      findFirst.mockResolvedValue(storedProfile());
      itemsGet.mockResolvedValue({
        title: 'old title',
        fields: [field('username'), field(TOTP_FIELD_TITLE, 'STORED-SEED')],
      });

      await service.storeProfileCredentials({
        organizationId: 'org_1',
        profileId: 'bap_1',
        username: 'user',
        password: 'pass',
      });

      const written = itemsPut.mock.calls[0][0];
      const totpFields = written.fields.filter(
        (f: Field) => f.title === TOTP_FIELD_TITLE,
      );
      expect(totpFields).toHaveLength(1);
      expect(totpFields[0].value).toBe('STORED-SEED');
    });

    it('replaces the stored TOTP seed when the re-save provides a new one', async () => {
      findFirst.mockResolvedValue(storedProfile());
      itemsGet.mockResolvedValue({
        title: 'old title',
        fields: [field('username'), field(TOTP_FIELD_TITLE, 'STORED-SEED')],
      });

      await service.storeProfileCredentials({
        organizationId: 'org_1',
        profileId: 'bap_1',
        username: 'user',
        password: 'pass',
        totpSeed: 'NEW-SEED',
      });

      const written = itemsPut.mock.calls[0][0];
      const totpFields = written.fields.filter(
        (f: Field) => f.title === TOTP_FIELD_TITLE,
      );
      expect(totpFields).toHaveLength(1);
      expect(totpFields[0].value).toBe('NEW-SEED');
    });

    it('propagates a write failure instead of creating a replacement', async () => {
      findFirst.mockResolvedValue(storedProfile());
      itemsGet.mockResolvedValue({
        title: 'old title',
        fields: [field('username'), field('password')],
      });
      itemsPut.mockRejectedValue(new Error('1Password service unavailable'));

      await expect(
        service.storeProfileCredentials({
          organizationId: 'org_1',
          profileId: 'bap_1',
          username: 'user',
          password: 'pass',
        }),
      ).rejects.toThrow('1Password service unavailable');

      // The item still exists — a replacement would orphan it and repoint the
      // profile, so neither the create path nor the DB update may run.
      expect(itemsCreate).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it('creates a replacement item when the stored one is unreadable', async () => {
      findFirst.mockResolvedValue(storedProfile());
      itemsGet.mockRejectedValue(new Error('item not found'));

      await service.storeProfileCredentials({
        organizationId: 'org_1',
        profileId: 'bap_1',
        username: 'user',
        password: 'pass',
      });

      expect(itemsPut).not.toHaveBeenCalled();
      expect(itemsCreate).toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vaultExternalItemRef: buildItemReference('vault-2', 'item-2'),
          }),
        }),
      );
    });
  });

  describe('clearProfileTotp', () => {
    it('drops the TOTP field and writes the item back', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({
        fields: [field('username'), field(TOTP_FIELD_TITLE, 'SEED')],
      });

      const result = await service.clearProfileTotp({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });

      expect(result).toEqual({ configured: false });
      const written = itemsPut.mock.calls[0][0];
      expect(written.fields.some((f: Field) => f.title === TOTP_FIELD_TITLE)).toBe(false);
    });

    it('is a no-op when there is no TOTP field', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({ fields: [field('username')] });

      const result = await service.clearProfileTotp({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });

      expect(result).toEqual({ configured: false });
      expect(itemsPut).not.toHaveBeenCalled();
    });
  });
});

import { BadRequestException } from '@nestjs/common';
import { BrowserCredentialStorageService } from './browser-credential-storage.service';
import * as opClient from './onepassword-client';
import { TOTP_FIELD_TITLE, buildItemReference } from './onepassword-credential-item';

jest.mock('@db', () => ({
  db: { browserAuthProfile: { findFirst: jest.fn() } },
}));
jest.mock('./onepassword-client');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require('@db');
const findFirst = db.browserAuthProfile.findFirst as jest.Mock;

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

  describe('setProfileTotp', () => {
    it('replaces any existing TOTP field and writes the item back', async () => {
      findFirst.mockResolvedValue(profile());
      itemsGet.mockResolvedValue({
        fields: [field('username'), field(TOTP_FIELD_TITLE, 'OLD')],
      });

      const result = await service.setProfileTotp({
        organizationId: 'org_1',
        profileId: 'bap_1',
        totpSeed: '  NEW SEED  ',
      });

      expect(result).toEqual({ configured: true });
      const written = itemsPut.mock.calls[0][0];
      const totpFields = written.fields.filter(
        (f: Field) => f.title === TOTP_FIELD_TITLE,
      );
      expect(totpFields).toHaveLength(1);
      expect(totpFields[0]).toMatchObject({ fieldType: 'Totp', value: 'NEW SEED' });
    });

    it('rejects when the connection has no stored login', async () => {
      findFirst.mockResolvedValue(profile({ vaultExternalItemRef: null }));

      await expect(
        service.setProfileTotp({
          organizationId: 'org_1',
          profileId: 'bap_1',
          totpSeed: 'SEED',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(itemsPut).not.toHaveBeenCalled();
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

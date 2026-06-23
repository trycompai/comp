jest.mock('@db', () => ({
  db: {
    integrationConnection: { findMany: jest.fn(), findUnique: jest.fn() },
    integrationCredentialVersion: { findUnique: jest.fn() },
    integrationCheckRun: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}));

import { NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { InternalIntegrationDebugService } from './internal-integration-debug.service';
import type { ConnectionCheckRunnerService } from './connection-check-runner.service';

const encryptedBlob = {
  encrypted: 'Y2lwaGVydGV4dA==',
  iv: 'aXY=',
  tag: 'dGFn',
  salt: 'c2FsdA==',
};

const mockedDb = db as unknown as {
  integrationConnection: { findMany: jest.Mock; findUnique: jest.Mock };
  integrationCredentialVersion: { findUnique: jest.Mock };
  integrationCheckRun: { findFirst: jest.Mock; findMany: jest.Mock };
};

const makeService = (runner: Partial<ConnectionCheckRunnerService> = {}) =>
  new InternalIntegrationDebugService(
    runner as ConnectionCheckRunnerService,
  );

describe('InternalIntegrationDebugService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('credential metadata (never leaks secrets)', () => {
    it('masks encrypted blobs and secret-named fields, exposes only non-secret routing values', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_1',
          organizationId: 'org_1',
          provider: { slug: 'zoho-crm', name: 'Zoho CRM' },
          status: 'active',
          errorMessage: null,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          variables: null,
          activeCredentialVersionId: 'icv_1',
        },
      ]);
      mockedDb.integrationCredentialVersion.findUnique.mockResolvedValue({
        version: 14,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date(Date.now() + 3_600_000),
        encryptedPayload: {
          access_token: encryptedBlob,
          refresh_token: encryptedBlob,
          client_secret: 'should-be-masked-even-though-plaintext',
          api_domain: 'https://www.zohoapis.eu',
          scope: 'ZohoCRM.users.READ',
          region: 'us2.ninjarmm.com',
          token_type: 'Bearer',
        },
      });
      mockedDb.integrationCheckRun.findFirst.mockResolvedValue(null);

      const service = makeService();
      const { connections } = await service.listConnections({
        organizationId: 'org_1',
      });
      const fields = connections[0].credential!.fields as Record<
        string,
        Record<string, unknown>
      >;

      // Secrets: never a raw value.
      expect(fields.access_token).toEqual({ present: true, encrypted: true });
      expect(fields.refresh_token).toEqual({ present: true, encrypted: true });
      // Plaintext but secret-named → masked, not exposed.
      expect(fields.client_secret).toEqual({ present: true, masked: true });
      expect(fields.client_secret).not.toHaveProperty('value');
      // Non-secret routing fields → exposed for debugging.
      expect(fields.api_domain).toEqual({
        present: true,
        value: 'https://www.zohoapis.eu',
      });
      expect(fields.scope).toEqual({ present: true, value: 'ZohoCRM.users.READ' });
      expect(fields.region).toEqual({ present: true, value: 'us2.ninjarmm.com' });

      // Absolutely no plaintext secret value anywhere in the response.
      expect(JSON.stringify(connections)).not.toContain('should-be-masked');
      expect(connections[0].credential!.expired).toBe(false);
    });

    it('flags an expired credential version', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_2',
          organizationId: 'org_1',
          provider: { slug: 'zoho-crm', name: 'Zoho CRM' },
          status: 'active',
          errorMessage: null,
          updatedAt: new Date(),
          variables: null,
          activeCredentialVersionId: 'icv_2',
        },
      ]);
      mockedDb.integrationCredentialVersion.findUnique.mockResolvedValue({
        version: 1,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date(Date.now() - 1_000),
        encryptedPayload: { access_token: encryptedBlob },
      });
      mockedDb.integrationCheckRun.findFirst.mockResolvedValue(null);

      const service = makeService();
      const { connections } = await service.listConnections({});
      expect(connections[0].credential!.expired).toBe(true);
    });

    it('returns null credential when the connection has no active version', async () => {
      mockedDb.integrationConnection.findMany.mockResolvedValue([
        {
          id: 'icn_3',
          organizationId: 'org_1',
          provider: { slug: 'x', name: 'X' },
          status: 'pending',
          errorMessage: null,
          updatedAt: new Date(),
          variables: null,
          activeCredentialVersionId: null,
        },
      ]);
      mockedDb.integrationCheckRun.findFirst.mockResolvedValue(null);

      const service = makeService();
      const { connections } = await service.listConnections({});
      expect(connections[0].credential).toBeNull();
      expect(
        mockedDb.integrationCredentialVersion.findUnique,
      ).not.toHaveBeenCalled();
    });
  });

  describe('runConnectionChecks', () => {
    it('resolves the org from the connection and delegates to the runner (no persistence)', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'org_42',
      });
      const runChecks = jest.fn().mockResolvedValue({
        results: [],
        totalFindings: 0,
        totalPassing: 0,
        durationMs: 5,
      });
      const service = makeService({ runChecks });

      const result = await service.runConnectionChecks({
        connectionId: 'icn_9',
        checkId: 'zoho_crm_employee_access',
      });

      expect(runChecks).toHaveBeenCalledWith({
        connectionId: 'icn_9',
        organizationId: 'org_42',
        checkId: 'zoho_crm_employee_access',
      });
      expect(result.totalFindings).toBe(0);
    });

    it('throws NotFound when the connection does not exist', async () => {
      mockedDb.integrationConnection.findUnique.mockResolvedValue(null);
      const runChecks = jest.fn();
      const service = makeService({ runChecks });

      await expect(
        service.runConnectionChecks({ connectionId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(runChecks).not.toHaveBeenCalled();
    });
  });
});

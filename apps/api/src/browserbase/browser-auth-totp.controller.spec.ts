import { Reflector } from '@nestjs/core';
import type { BrowserCredentialStorageService } from './browser-credential-storage.service';
import { BrowserAuthTotpController } from './browser-auth-totp.controller';

// The controller imports the auth guards, which pull in the real Prisma client
// and better-auth (ESM) at module load. Stub those so importing the controller
// doesn't open a DB connection or fail to parse — the guards aren't executed here
// (we test the controller methods + their RBAC metadata directly).
jest.mock('@db', () => ({
  db: {},
  // The DTO module (transitively imported) decorates fields with
  // @IsEnum(TaskFrequency), so the enum must exist at module-eval time.
  TaskFrequency: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
}));
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock('@gideon-defender/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

// Mirrors PERMISSIONS_KEY in ../auth/permission.guard — imported by value rather
// than by reference so the test doesn't pull the guard's better-auth (ESM) chain
// into Jest. Keep in sync with the guard.
const PERMISSIONS_KEY = 'required_permissions';

describe('BrowserAuthTotpController', () => {
  const service = {
    getOrgTotpStatuses: jest.fn(),
    getProfileTotpStatus: jest.fn(),
    setProfileTotp: jest.fn(),
    clearProfileTotp: jest.fn(),
  };
  let controller: BrowserAuthTotpController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BrowserAuthTotpController(
      service as unknown as BrowserCredentialStorageService,
    );
  });

  describe('delegation (organization + profile scoping reaches storage)', () => {
    it('getOrgTotpStatuses passes the org id and wraps the map', async () => {
      service.getOrgTotpStatuses.mockResolvedValue({ bap_1: true });

      const res = await controller.getOrgTotpStatuses('org_1');

      expect(service.getOrgTotpStatuses).toHaveBeenCalledWith('org_1');
      expect(res).toEqual({ statuses: { bap_1: true } });
    });

    it('getProfileTotp passes the org + profile ids', async () => {
      service.getProfileTotpStatus.mockResolvedValue({ configured: true });

      const res = await controller.getProfileTotp('org_1', 'bap_1');

      expect(service.getProfileTotpStatus).toHaveBeenCalledWith({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });
      expect(res).toEqual({ configured: true });
    });

    it('setProfileTotp forwards the seed with org + profile ids', async () => {
      service.setProfileTotp.mockResolvedValue({ configured: true });

      await controller.setProfileTotp('org_1', 'bap_1', {
        totpSeed: 'JBSWY3DPEHPK3PXP',
      });

      expect(service.setProfileTotp).toHaveBeenCalledWith({
        organizationId: 'org_1',
        profileId: 'bap_1',
        totpSeed: 'JBSWY3DPEHPK3PXP',
      });
    });

    it('clearProfileTotp passes the org + profile ids', async () => {
      service.clearProfileTotp.mockResolvedValue({ configured: false });

      await controller.clearProfileTotp('org_1', 'bap_1');

      expect(service.clearProfileTotp).toHaveBeenCalledWith({
        organizationId: 'org_1',
        profileId: 'bap_1',
      });
    });
  });

  describe('RBAC — reads require integration:read, writes require integration:update', () => {
    const reflector = new Reflector();
    const permsOf = (method: object) =>
      reflector.get(PERMISSIONS_KEY, method as never);

    it('gates read routes with integration:read', () => {
      expect(permsOf(BrowserAuthTotpController.prototype.getOrgTotpStatuses)).toEqual(
        [{ resource: 'integration', actions: ['read'] }],
      );
      expect(permsOf(BrowserAuthTotpController.prototype.getProfileTotp)).toEqual([
        { resource: 'integration', actions: ['read'] },
      ]);
    });

    it('gates write routes with integration:update', () => {
      expect(permsOf(BrowserAuthTotpController.prototype.setProfileTotp)).toEqual([
        { resource: 'integration', actions: ['update'] },
      ]);
      expect(permsOf(BrowserAuthTotpController.prototype.clearProfileTotp)).toEqual(
        [{ resource: 'integration', actions: ['update'] }],
      );
    });
  });
});

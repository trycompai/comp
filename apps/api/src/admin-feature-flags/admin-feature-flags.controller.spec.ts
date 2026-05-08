import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock('@db', () => ({
  db: {
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class MockGuard {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../admin-organizations/admin-audit-log.interceptor', () => ({
  AdminAuditLogInterceptor: class MockInterceptor {
    intercept(_ctx: unknown, next: { handle: () => unknown }) {
      return next.handle();
    }
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { AdminFeatureFlagsController } from './admin-feature-flags.controller';
import { AdminFeatureFlagsService } from './admin-feature-flags.service';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminAuditLogInterceptor } from '../admin-organizations/admin-audit-log.interceptor';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const mockDb = require('@db').db as {
  organization: { findUnique: jest.Mock };
};

describe('AdminFeatureFlagsController', () => {
  let controller: AdminFeatureFlagsController;
  let service: {
    listForOrganization: jest.Mock;
    setFlagForOrganization: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    service = {
      listForOrganization: jest.fn(),
      setFlagForOrganization: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminFeatureFlagsController],
      providers: [{ provide: AdminFeatureFlagsService, useValue: service }],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(AdminAuditLogInterceptor)
      .useValue({ intercept: (_ctx: unknown, next: { handle: () => unknown }) => next.handle() })
      .compile();

    controller = module.get(AdminFeatureFlagsController);
  });

  describe('list', () => {
    it('throws NotFoundException when the org does not exist', async () => {
      mockDb.organization.findUnique.mockResolvedValue(null);
      await expect(controller.list('org_missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(service.listForOrganization).not.toHaveBeenCalled();
    });

    it('returns flags wrapped in { data } when the org exists', async () => {
      mockDb.organization.findUnique.mockResolvedValue({ id: 'org_1' });
      service.listForOrganization.mockResolvedValue([
        {
          key: 'is-timeline-enabled',
          name: 'is-timeline-enabled',
          description: '',
          active: true,
          enabled: true,
          createdAt: null,
        },
      ]);

      const result = await controller.list('org_1');

      expect(service.listForOrganization).toHaveBeenCalledWith('org_1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].key).toBe('is-timeline-enabled');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the org does not exist', async () => {
      mockDb.organization.findUnique.mockResolvedValue(null);
      await expect(
        controller.update('org_missing', {
          flagKey: 'is-timeline-enabled',
          enabled: true,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(service.setFlagForOrganization).not.toHaveBeenCalled();
    });

    it('delegates to the service with orgId, orgName, flagKey, and enabled', async () => {
      mockDb.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        name: 'Acme',
      });
      service.setFlagForOrganization.mockResolvedValue({
        key: 'is-timeline-enabled',
        enabled: false,
      });

      const result = await controller.update('org_1', {
        flagKey: 'is-timeline-enabled',
        enabled: false,
      });

      expect(service.setFlagForOrganization).toHaveBeenCalledWith({
        orgId: 'org_1',
        orgName: 'Acme',
        flagKey: 'is-timeline-enabled',
        enabled: false,
      });
      expect(result.data.enabled).toBe(false);
    });
  });
});

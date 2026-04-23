jest.mock('@db', () => ({
  db: {},
}));

jest.mock('../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class MockGuard {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { FrameworkVersionsController, FrameworkDraftDiffController } from './framework-versions.controller';
import { FrameworkVersionsService } from './framework-versions.service';
import type { PublishVersionDto } from './dto/publish-version.dto';
import type { AdminRequest } from '../admin-organizations/platform-admin-auth-context';

describe('FrameworkVersionsController', () => {
  let controller: FrameworkVersionsController;
  const service = {
    publish: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
    getVersionDiff: jest.fn(),
  };

  const mockAdminReq: AdminRequest = { userId: 'usr_admin' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [FrameworkVersionsController],
      providers: [{ provide: FrameworkVersionsService, useValue: service }],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = mod.get(FrameworkVersionsController);
  });

  describe('publish (POST /)', () => {
    it('publishes a version and returns { data: version }', async () => {
      service.publish.mockResolvedValue({ id: 'fvr_1' });

      const dto: PublishVersionDto = { version: '2.0.0', releaseNotes: 'Initial release' };
      const result = await controller.publish('frk_1', dto, mockAdminReq);

      expect(service.publish).toHaveBeenCalledWith({
        frameworkId: 'frk_1',
        version: '2.0.0',
        releaseNotes: 'Initial release',
        publishedById: 'usr_admin',
      });
      expect(result).toEqual({ data: { id: 'fvr_1' } });
    });

    it('forwards the userId from the request', async () => {
      service.publish.mockResolvedValue({ id: 'fvr_2' });

      const dto: PublishVersionDto = { version: '1.0.0' };
      await controller.publish('frk_2', dto, { userId: 'usr_specific' });

      expect(service.publish).toHaveBeenCalledWith(
        expect.objectContaining({ publishedById: 'usr_specific' }),
      );
    });
  });

  describe('list (GET /)', () => {
    it('returns { data, count } for a framework', async () => {
      service.list.mockResolvedValue([{ id: 'fvr_1' }, { id: 'fvr_2' }]);

      const result = await controller.list('frk_1');

      expect(service.list).toHaveBeenCalledWith('frk_1');
      expect(result).toEqual({ data: [{ id: 'fvr_1' }, { id: 'fvr_2' }], count: 2 });
    });

    it('returns count 0 when no versions exist', async () => {
      service.list.mockResolvedValue([]);

      const result = await controller.list('frk_empty');

      expect(result.count).toBe(0);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('get (GET /:versionId)', () => {
    it('returns { data: version } for a specific version', async () => {
      service.get.mockResolvedValue({ id: 'fvr_1', version: '1.0.0' });

      const result = await controller.get('frk_1', 'fvr_1');

      expect(service.get).toHaveBeenCalledWith('frk_1', 'fvr_1');
      expect(result).toEqual({ data: { id: 'fvr_1', version: '1.0.0' } });
    });
  });

  describe('getDiff (GET /:versionId/diff)', () => {
    it('returns { data } with version/previousVersion/diff/linkChanges', async () => {
      const payload = {
        version: { id: 'fvr_2', version: '1.1.0', publishedAt: new Date(), releaseNotes: null },
        previousVersion: { id: 'fvr_1', version: '1.0.0' },
        diff: {
          controls: { added: [], removed: [], updated: [] },
          requirements: { added: [], removed: [], updated: [] },
          policies: { added: [], removed: [], updated: [] },
          tasks: { added: [], removed: [], updated: [] },
          requirementMapEdges: { added: [], removed: [] },
          controlPolicyEdges: { added: [], removed: [] },
          controlTaskEdges: { added: [], removed: [] },
          controlDocumentTypeEdges: { added: [], removed: [] },
        },
        linkChanges: {
          controlRequirement: { added: [], removed: [] },
          controlPolicy: { added: [], removed: [] },
          controlTask: { added: [], removed: [] },
          controlDocumentType: { added: [], removed: [] },
        },
      };
      service.getVersionDiff.mockResolvedValue(payload);

      const result = await controller.getDiff('frk_1', 'fvr_2');

      expect(service.getVersionDiff).toHaveBeenCalledWith('frk_1', 'fvr_2');
      expect(result).toEqual({ data: payload });
    });

    it('propagates NotFoundException for a missing version', async () => {
      service.getVersionDiff.mockRejectedValue(new NotFoundException('Version not found'));
      await expect(controller.getDiff('frk_1', 'fvr_missing')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('FrameworkDraftDiffController', () => {
  let draftDiffController: FrameworkDraftDiffController;
  const draftDiffService = {
    getDraftDiff: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mod: TestingModule = await Test.createTestingModule({
      controllers: [FrameworkDraftDiffController],
      providers: [{ provide: FrameworkVersionsService, useValue: draftDiffService }],
    })
      .overrideGuard(PlatformAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    draftDiffController = mod.get(FrameworkDraftDiffController);
  });

  describe('getDraftDiff (GET /draft-diff)', () => {
    it('returns { data } with latestVersion and diff', async () => {
      const mockDiff = {
        latestVersion: { id: 'fvr_1', version: '1.0.0' },
        diff: {
          controls: { added: [], removed: [], updated: [] },
          tasks: { added: [], removed: [], updated: [] },
          policies: { added: [], removed: [], updated: [] },
          requirements: { added: [], removed: [], updated: [] },
        },
      };
      draftDiffService.getDraftDiff.mockResolvedValue(mockDiff);

      const result = await draftDiffController.getDraftDiff('frk_1');

      expect(draftDiffService.getDraftDiff).toHaveBeenCalledWith('frk_1');
      expect(result).toEqual({ data: mockDiff });
    });

    it('propagates NotFoundException when no published version exists', async () => {
      draftDiffService.getDraftDiff.mockRejectedValue(
        new NotFoundException('No published version yet — publish v1.0.0 first'),
      );

      await expect(draftDiffController.getDraftDiff('frk_empty')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

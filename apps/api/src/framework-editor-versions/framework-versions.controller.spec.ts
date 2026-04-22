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
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { FrameworkVersionsController } from './framework-versions.controller';
import { FrameworkVersionsService } from './framework-versions.service';
import type { PublishVersionDto } from './dto/publish-version.dto';
import type { AdminRequest } from '../admin-organizations/platform-admin-auth-context';

describe('FrameworkVersionsController', () => {
  let controller: FrameworkVersionsController;
  const service = {
    publish: jest.fn(),
    list: jest.fn(),
    get: jest.fn(),
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
});

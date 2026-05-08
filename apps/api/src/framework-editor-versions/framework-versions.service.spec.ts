import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FrameworkVersionsService } from './framework-versions.service';
import { buildManifestForFramework } from './framework-manifest-builder';

jest.mock('./framework-manifest-builder');
jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    frameworkVersion: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  },
}));
import { db } from '@db';

describe('FrameworkVersionsService', () => {
  let service: FrameworkVersionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({ providers: [FrameworkVersionsService] }).compile();
    service = mod.get(FrameworkVersionsService);
  });

  describe('publish', () => {
    it('creates a new version using the manifest builder', async () => {
      (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({ id: 'frk_1', name: 'SOC 2' });
      (db.frameworkVersion.findUnique as jest.Mock).mockResolvedValue(null);
      (buildManifestForFramework as jest.Mock).mockResolvedValue({ framework: { id: 'frk_1' }, requirements: [], controls: [], policies: [], tasks: [] });
      (db.frameworkVersion.create as jest.Mock).mockResolvedValue({ id: 'fvr_1', frameworkId: 'frk_1', version: '2.0.0' });

      const result = await service.publish({ frameworkId: 'frk_1', version: '2.0.0', releaseNotes: 'fix wording', publishedById: 'mem_1' });

      expect(db.frameworkVersion.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ frameworkId: 'frk_1', version: '2.0.0', publishedById: 'mem_1', releaseNotes: 'fix wording' }),
      }));
      expect(result.id).toBe('fvr_1');
    });

    it('rejects duplicate version', async () => {
      (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({ id: 'frk_1' });
      (db.frameworkVersion.findUnique as jest.Mock).mockResolvedValue({ id: 'fvr_existing' });

      await expect(service.publish({ frameworkId: 'frk_1', version: '1.0.0', publishedById: 'mem_1' }))
        .rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when framework does not exist', async () => {
      (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.publish({ frameworkId: 'missing', version: '1.0.0', publishedById: 'mem_1' }))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-semver version', async () => {
      (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({ id: 'frk_1' });
      await expect(service.publish({ frameworkId: 'frk_1', version: 'latest', publishedById: 'mem_1' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns versions ordered by publishedAt desc', async () => {
      (db.frameworkVersion.findMany as jest.Mock).mockResolvedValue([
        { id: 'fvr_2', version: '2.0.0' },
        { id: 'fvr_1', version: '1.0.0' },
      ]);

      const list = await service.list('frk_1');

      expect(db.frameworkVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { frameworkId: 'frk_1' },
        orderBy: { publishedAt: 'desc' },
      }));
      expect(list).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('returns the version', async () => {
      (db.frameworkVersion.findUnique as jest.Mock).mockResolvedValue({ id: 'fvr_1', frameworkId: 'frk_1' });
      const v = await service.get('frk_1', 'fvr_1');
      expect(v.id).toBe('fvr_1');
    });

    it('404s when the version does not belong to the framework', async () => {
      (db.frameworkVersion.findUnique as jest.Mock).mockResolvedValue({ id: 'fvr_1', frameworkId: 'frk_other' });
      await expect(service.get('frk_1', 'fvr_1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

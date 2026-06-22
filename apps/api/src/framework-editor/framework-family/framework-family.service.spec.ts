jest.mock('@db', () => ({
  db: {
    frameworkEditorFrameworkFamily: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    frameworkEditorFramework: {
      updateMany: jest.fn(),
    },
  },
  FrameworkEditorFrameworkFamilyStatus: {
    visible: 'visible',
    hidden: 'hidden',
    under_construction: 'under_construction',
    partial: 'partial',
  },
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { FrameworkFamilyService } from './framework-family.service';

const mockDb = db as jest.Mocked<typeof db>;
const familyDb = mockDb.frameworkEditorFrameworkFamily as unknown as Record<string, jest.Mock>;
const frameworkDb = mockDb.frameworkEditorFramework as unknown as Record<string, jest.Mock>;

describe('FrameworkFamilyService', () => {
  let service: FrameworkFamilyService;

  beforeEach(() => {
    service = new FrameworkFamilyService();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('maps the framework _count into frameworksCount and strips _count', async () => {
      familyDb.findMany.mockResolvedValue([
        { id: 'frk_fam_1', name: 'NIST', _count: { frameworks: 3 } },
      ]);
      const result = await service.findAll();
      expect(result[0]).toEqual({ id: 'frk_fam_1', name: 'NIST', frameworksCount: 3, _count: undefined });
    });
  });

  describe('create', () => {
    it('defaults description to "" and status to hidden when omitted', async () => {
      familyDb.create.mockResolvedValue({ id: 'frk_fam_new', name: 'X' });
      await service.create({ name: 'X' } as never);
      expect(familyDb.create.mock.calls[0][0].data).toEqual({
        name: 'X',
        description: '',
        status: 'hidden',
      });
    });

    it('persists a provided status and description', async () => {
      familyDb.create.mockResolvedValue({ id: 'frk_fam_new', name: 'X' });
      await service.create({ name: 'X', description: 'd', status: 'partial' } as never);
      expect(familyDb.create.mock.calls[0][0].data).toEqual({
        name: 'X',
        description: 'd',
        status: 'partial',
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when the family does not exist', async () => {
      familyDb.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'Y' } as never)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('only writes provided fields', async () => {
      familyDb.findUnique.mockResolvedValue({ id: 'frk_fam_1', _count: { frameworks: 0 } });
      familyDb.update.mockResolvedValue({ id: 'frk_fam_1', name: 'Y' });
      await service.update('frk_fam_1', { name: 'Y' } as never);
      expect(familyDb.update.mock.calls[0][0].data).toEqual({ name: 'Y' });
    });

    it('ignores explicit null fields (does not write null to non-nullable columns)', async () => {
      familyDb.findUnique.mockResolvedValue({ id: 'frk_fam_1', _count: { frameworks: 0 } });
      familyDb.update.mockResolvedValue({ id: 'frk_fam_1' });
      await service.update('frk_fam_1', {
        name: null,
        description: null,
        status: null,
      } as never);
      expect(familyDb.update.mock.calls[0][0].data).toEqual({});
    });
  });

  describe('delete', () => {
    it('refuses to delete a family that still contains frameworks', async () => {
      familyDb.findUnique.mockResolvedValue({
        id: 'frk_fam_1',
        name: 'NIST',
        _count: { frameworks: 2 },
      });
      await expect(service.delete('frk_fam_1')).rejects.toBeInstanceOf(BadRequestException);
      expect(familyDb.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty family', async () => {
      familyDb.findUnique.mockResolvedValue({
        id: 'frk_fam_1',
        name: 'NIST',
        _count: { frameworks: 0 },
      });
      familyDb.delete.mockResolvedValue({});
      await service.delete('frk_fam_1');
      expect(familyDb.delete).toHaveBeenCalledWith({ where: { id: 'frk_fam_1' } });
    });

    it('throws NotFound for a missing family', async () => {
      familyDb.findUnique.mockResolvedValue(null);
      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('moveFrameworks', () => {
    it('validates the destination family exists before moving', async () => {
      familyDb.findUnique.mockResolvedValue(null);
      await expect(service.moveFrameworks(['frk_1'], 'frk_fam_missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(frameworkDb.updateMany).not.toHaveBeenCalled();
    });

    it('moves frameworks into a family', async () => {
      familyDb.findUnique.mockResolvedValue({ id: 'frk_fam_1' });
      frameworkDb.updateMany.mockResolvedValue({ count: 2 });
      const result = await service.moveFrameworks(['frk_1', 'frk_2'], 'frk_fam_1');
      expect(frameworkDb.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['frk_1', 'frk_2'] } },
        data: { familyId: 'frk_fam_1' },
      });
      expect(result).toEqual({ count: 2 });
    });

    it('moves frameworks to the root (null) without a family lookup', async () => {
      frameworkDb.updateMany.mockResolvedValue({ count: 1 });
      await service.moveFrameworks(['frk_1'], null);
      expect(familyDb.findUnique).not.toHaveBeenCalled();
      expect(frameworkDb.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['frk_1'] } },
        data: { familyId: null },
      });
    });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { IsmsRoleService } from './isms-role.service';

jest.mock('@db', () => {
  const db = {
    ismsDocument: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    member: { findFirst: jest.fn() },
    ismsRole: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(db)),
  };
  return { db };
});

const mockDb = jest.mocked(db);

describe('IsmsRoleService', () => {
  let service: IsmsRoleService;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.ismsDocument.findUnique as jest.Mock).mockResolvedValue({ status: 'draft' });
    service = new IsmsRoleService();
  });

  describe('create', () => {
    const args = {
      documentId: 'doc_1',
      organizationId: 'org_1',
      dto: { name: 'Data Protection Officer' },
    };

    it('throws NotFoundException when the document is missing', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.create(args)).rejects.toThrow(NotFoundException);
    });

    it('creates a custom (manual, roleKey null) role', async () => {
      (mockDb.ismsDocument.findFirst as jest.Mock).mockResolvedValue({ id: 'doc_1' });
      (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({ position: 1 });
      (mockDb.ismsRole.create as jest.Mock).mockResolvedValue({ id: 'role_1' });

      await service.create(args);

      expect(mockDb.ismsRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          roleKey: null,
          source: 'manual',
          position: 2,
          name: 'Data Protection Officer',
          authorityGrantedBy: 'Top Management',
        }),
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the role is not in the org', async () => {
      (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update({ roleId: 'role_1', organizationId: 'org_1', dto: {} }),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves the audit route and flips source to manual', async () => {
      (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({
        id: 'role_1',
        documentId: 'doc_1',
        source: 'derived',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue({ id: 'mem_1' });
      (mockDb.ismsRole.update as jest.Mock).mockResolvedValue({});

      await service.update({
        roleId: 'role_1',
        organizationId: 'org_1',
        dto: { auditRoute: 'in_house', auditRouteMemberId: 'mem_1' },
      });

      expect(mockDb.ismsRole.update).toHaveBeenCalledWith({
        where: { id: 'role_1' },
        data: expect.objectContaining({
          auditRoute: 'in_house',
          auditRouteMemberId: 'mem_1',
          source: 'manual',
        }),
      });
    });

    it('rejects an audit-route member who is not in the org', async () => {
      (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({
        id: 'role_1',
        documentId: 'doc_1',
      });
      (mockDb.member.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.update({
          roleId: 'role_1',
          organizationId: 'org_1',
          dto: { auditRouteMemberId: 'mem_other' },
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockDb.ismsRole.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('blocks deleting a seeded role', async () => {
      (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({
        id: 'role_1',
        roleKey: 'spo',
        documentId: 'doc_1',
      });
      await expect(
        service.remove({ roleId: 'role_1', organizationId: 'org_1' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockDb.ismsRole.delete).not.toHaveBeenCalled();
    });

    it('deletes a custom role', async () => {
      (mockDb.ismsRole.findFirst as jest.Mock).mockResolvedValue({
        id: 'role_1',
        roleKey: null,
        documentId: 'doc_1',
      });
      (mockDb.ismsRole.delete as jest.Mock).mockResolvedValue({});
      const result = await service.remove({ roleId: 'role_1', organizationId: 'org_1' });
      expect(result).toEqual({ success: true });
      expect(mockDb.ismsRole.delete).toHaveBeenCalledWith({ where: { id: 'role_1' } });
    });
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockDb = {
  offboardingChecklistTemplate: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  offboardingChecklistCompletion: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  offboardingAccessRevocation: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  vendor: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  member: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  attachment: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockDb) => Promise<unknown>) => fn(mockDb)),
};

jest.mock('@db', () => ({
  db: mockDb,
  AttachmentEntityType: {
    offboarding_checklist: 'offboarding_checklist',
  },
}));

import { OffboardingChecklistService } from './offboarding-checklist.service';
import { AccessRevocationService } from './access-revocation.service';
import { DEFAULT_OFFBOARDING_CHECKLIST_ITEMS } from './default-checklist-items';

describe('OffboardingChecklistService', () => {
  const mockAttachmentsService = {
    getAttachments: jest.fn(),
    uploadAttachment: jest.fn(),
    deleteAttachment: jest.fn(),
    getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://signed-url.example.com'),
  };

  let service: OffboardingChecklistService;
  let accessRevocationService: AccessRevocationService;

  beforeEach(() => {
    jest.clearAllMocks();
    accessRevocationService = new AccessRevocationService(mockAttachmentsService as never);
    service = new OffboardingChecklistService(
      mockAttachmentsService as never,
      accessRevocationService,
    );
  });

  describe('getTemplate', () => {
    it('seeds defaults when none exist', async () => {
      mockDb.offboardingChecklistTemplate.count.mockResolvedValue(0);
      mockDb.offboardingChecklistTemplate.createMany.mockResolvedValue({
        count: DEFAULT_OFFBOARDING_CHECKLIST_ITEMS.length,
      });
      mockDb.offboardingChecklistTemplate.findMany.mockResolvedValue(
        DEFAULT_OFFBOARDING_CHECKLIST_ITEMS.map((item, i) => ({
          id: `oct_${i}`,
          organizationId: 'org_1',
          ...item,
          isDefault: true,
          isEnabled: true,
        })),
      );

      const result = await service.getTemplate('org_1');

      expect(
        mockDb.offboardingChecklistTemplate.createMany,
      ).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            organizationId: 'org_1',
            title: 'Revoke system access',
            isDefault: true,
            isEnabled: true,
          }),
        ]),
      });
      expect(result).toHaveLength(DEFAULT_OFFBOARDING_CHECKLIST_ITEMS.length);
    });

    it('returns existing items without seeding', async () => {
      const existingItems = [
        {
          id: 'oct_1',
          organizationId: 'org_1',
          title: 'Custom item',
          isDefault: false,
          isEnabled: true,
          sortOrder: 1,
        },
      ];
      mockDb.offboardingChecklistTemplate.count.mockResolvedValue(1);
      mockDb.offboardingChecklistTemplate.findMany.mockResolvedValue(
        existingItems,
      );

      const result = await service.getTemplate('org_1');

      expect(
        mockDb.offboardingChecklistTemplate.createMany,
      ).not.toHaveBeenCalled();
      expect(result).toEqual(existingItems);
    });
  });

  describe('getMemberChecklist', () => {
    it('returns items with completion status', async () => {
      mockDb.offboardingChecklistTemplate.count.mockResolvedValue(2);
      mockDb.offboardingChecklistTemplate.findMany.mockResolvedValue([
        {
          id: 'oct_1',
          organizationId: 'org_1',
          title: 'Item 1',
          isEnabled: true,
          sortOrder: 1,
        },
        {
          id: 'oct_2',
          organizationId: 'org_1',
          title: 'Item 2',
          isEnabled: true,
          sortOrder: 2,
        },
      ]);
      mockDb.offboardingChecklistCompletion.findMany.mockResolvedValue([
        {
          id: 'occ_1',
          templateItemId: 'oct_1',
          memberId: 'mem_1',
          completedById: 'usr_1',
          completedBy: { id: 'usr_1', name: 'Test User' },
        },
      ]);
      mockDb.attachment.findMany.mockResolvedValue([
        { id: 'att_1', name: 'evidence.pdf', url: 's3://bucket/key', entityId: 'occ_1' },
      ]);

      const result = await service.getMemberChecklist('org_1', 'mem_1');

      expect(result.totalItems).toBe(2);
      expect(result.completedItems).toBe(1);
      expect(result.items[0].completed).toBe(true);
      expect(result.items[0].evidence).toHaveLength(1);
      expect(result.items[1].completed).toBe(false);
      expect(result.items[1].evidence).toHaveLength(0);
    });
  });

  describe('completeItem', () => {
    it('creates completion record', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue(null);
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue({
        id: 'oct_1',
        organizationId: 'org_1',
        isEnabled: true,
      });
      mockDb.offboardingChecklistCompletion.create.mockResolvedValue({
        id: 'occ_1',
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
        completedById: 'usr_1',
        notes: 'Done',
      });

      const result = await service.completeItem({
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
        completedById: 'usr_1',
        dto: { notes: 'Done' },
      });

      expect(result.id).toBe('occ_1');
      expect(
        mockDb.offboardingChecklistCompletion.create,
      ).toHaveBeenCalledWith({
        data: {
          organizationId: 'org_1',
          memberId: 'mem_1',
          templateItemId: 'oct_1',
          completedById: 'usr_1',
          notes: 'Done',
        },
      });
    });

    it('throws if already completed', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue({
        id: 'occ_1',
      });

      await expect(
        service.completeItem({
          organizationId: 'org_1',
          memberId: 'mem_1',
          templateItemId: 'oct_1',
          completedById: 'usr_1',
          dto: {},
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws if template item not found', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue(null);
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.completeItem({
          organizationId: 'org_1',
          memberId: 'mem_1',
          templateItemId: 'oct_invalid',
          completedById: 'usr_1',
          dto: {},
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('uploads evidence when file data is provided', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue(null);
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue({
        id: 'oct_1',
        organizationId: 'org_1',
        isEnabled: true,
      });
      mockDb.offboardingChecklistCompletion.create.mockResolvedValue({
        id: 'occ_1',
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
        completedById: 'usr_1',
      });
      mockAttachmentsService.uploadAttachment.mockResolvedValue({
        id: 'att_1',
      });

      await service.completeItem({
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
        completedById: 'usr_1',
        dto: {
          fileName: 'evidence.pdf',
          fileType: 'application/pdf',
          fileData: 'base64data',
        },
      });

      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        'org_1',
        'occ_1',
        'offboarding_checklist',
        {
          fileName: 'evidence.pdf',
          fileData: 'base64data',
          fileType: 'application/pdf',
        },
        'usr_1',
      );
    });
  });

  describe('uncompleteItem', () => {
    it('deletes completion and associated evidence', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue({
        id: 'occ_1',
      });
      mockAttachmentsService.getAttachments.mockResolvedValue([
        { id: 'att_1' },
        { id: 'att_2' },
      ]);
      mockDb.offboardingChecklistCompletion.delete.mockResolvedValue({});

      await service.uncompleteItem({
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
      });

      expect(mockAttachmentsService.deleteAttachment).toHaveBeenCalledTimes(2);
      expect(
        mockDb.offboardingChecklistCompletion.delete,
      ).toHaveBeenCalledWith({ where: { id: 'occ_1' } });
    });

    it('throws if completion not found', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue(null);

      await expect(
        service.uncompleteItem({
          organizationId: 'org_1',
          memberId: 'mem_1',
          templateItemId: 'oct_1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteTemplateItem', () => {
    it('soft-disables default items', async () => {
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue({
        id: 'oct_1',
        organizationId: 'org_1',
        isDefault: true,
      });
      mockDb.offboardingChecklistTemplate.update.mockResolvedValue({
        id: 'oct_1',
        isEnabled: false,
      });

      const result = await service.deleteTemplateItem('org_1', 'oct_1');

      expect(
        mockDb.offboardingChecklistTemplate.update,
      ).toHaveBeenCalledWith({
        where: { id: 'oct_1' },
        data: { isEnabled: false },
      });
      expect(
        mockDb.offboardingChecklistTemplate.delete,
      ).not.toHaveBeenCalled();
      expect(result.isEnabled).toBe(false);
    });

    it('hard-deletes custom items', async () => {
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue({
        id: 'oct_2',
        organizationId: 'org_1',
        isDefault: false,
      });
      mockDb.offboardingChecklistTemplate.delete.mockResolvedValue({
        id: 'oct_2',
      });

      await service.deleteTemplateItem('org_1', 'oct_2');

      expect(
        mockDb.offboardingChecklistTemplate.delete,
      ).toHaveBeenCalledWith({ where: { id: 'oct_2' } });
      expect(
        mockDb.offboardingChecklistTemplate.update,
      ).not.toHaveBeenCalled();
    });

    it('throws if item not found', async () => {
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTemplateItem('org_1', 'oct_invalid'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('uploadEvidenceToCompletion', () => {
    it('uploads evidence to a completed item', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue({
        id: 'occ_1',
      });
      mockAttachmentsService.uploadAttachment.mockResolvedValue({
        id: 'att_1',
      });

      const result = await service.uploadEvidenceToCompletion({
        organizationId: 'org_1',
        memberId: 'mem_1',
        templateItemId: 'oct_1',
        uploadDto: {
          fileName: 'screenshot.png',
          fileType: 'image/png',
          fileData: 'base64data',
        },
        userId: 'usr_1',
      });

      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        'org_1',
        'occ_1',
        'offboarding_checklist',
        {
          fileName: 'screenshot.png',
          fileType: 'image/png',
          fileData: 'base64data',
        },
        'usr_1',
      );
      expect(result.id).toBe('att_1');
    });

    it('throws if item not yet completed', async () => {
      mockDb.offboardingChecklistCompletion.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadEvidenceToCompletion({
          organizationId: 'org_1',
          memberId: 'mem_1',
          templateItemId: 'oct_1',
          uploadDto: {
            fileName: 'screenshot.png',
            fileType: 'image/png',
            fileData: 'base64data',
          },
          userId: 'usr_1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getAccessRevocations', () => {
    it('returns vendor list with revocation status', async () => {
      mockDb.vendor.findMany.mockResolvedValue([
        { id: 'vnd_1', name: 'Slack', website: null, logoUrl: null },
        { id: 'vnd_2', name: 'AWS', website: null, logoUrl: null },
      ]);
      mockDb.offboardingAccessRevocation.findMany.mockResolvedValue([
        {
          id: 'oar_1',
          vendorId: 'vnd_1',
          revokedBy: { id: 'usr_1', name: 'Jane', email: 'jane@test.com' },
          revokedAt: new Date(),
          notes: null,
        },
      ]);
      mockDb.attachment.findMany.mockResolvedValue([]);

      const result = await service.getAccessRevocations('org_1', 'mem_1');

      expect(result.totalVendors).toBe(2);
      expect(result.revokedCount).toBe(1);
      expect(result.vendors[0].revoked).toBe(true);
      expect(result.vendors[1].revoked).toBe(false);
    });

    it('returns empty when no vendors exist', async () => {
      mockDb.vendor.findMany.mockResolvedValue([]);
      mockDb.offboardingAccessRevocation.findMany.mockResolvedValue([]);
      mockDb.attachment.findMany.mockResolvedValue([]);

      const result = await service.getAccessRevocations('org_1', 'mem_1');

      expect(result.totalVendors).toBe(0);
      expect(result.revokedCount).toBe(0);
      expect(result.vendors).toHaveLength(0);
    });
  });

  describe('revokeVendorAccess', () => {
    it('creates revocation record', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'mem_1', organizationId: 'org_1' });
      mockDb.vendor.findFirst.mockResolvedValue({ id: 'vnd_1' });
      mockDb.offboardingAccessRevocation.findUnique.mockResolvedValue(null);
      mockDb.offboardingAccessRevocation.create.mockResolvedValue({
        id: 'oar_1',
        vendorId: 'vnd_1',
        revokedBy: { id: 'usr_1', name: 'Jane', email: 'jane@test.com' },
      });
      // syncAccessRevocationCompletion mocks
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue(null);

      const result = await service.revokeVendorAccess({
        organizationId: 'org_1',
        memberId: 'mem_1',
        vendorId: 'vnd_1',
        revokedById: 'usr_1',
      });

      expect(mockDb.offboardingAccessRevocation.create).toHaveBeenCalled();
      expect(result.id).toBe('oar_1');
    });

    it('throws if vendor not found', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'mem_1', organizationId: 'org_1' });
      mockDb.vendor.findFirst.mockResolvedValue(null);

      await expect(
        service.revokeVendorAccess({
          organizationId: 'org_1',
          memberId: 'mem_1',
          vendorId: 'vnd_invalid',
          revokedById: 'usr_1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws if already revoked', async () => {
      mockDb.member.findFirst.mockResolvedValue({ id: 'mem_1', organizationId: 'org_1' });
      mockDb.vendor.findFirst.mockResolvedValue({ id: 'vnd_1' });
      mockDb.offboardingAccessRevocation.findUnique.mockResolvedValue({
        id: 'oar_1',
      });

      await expect(
        service.revokeVendorAccess({
          organizationId: 'org_1',
          memberId: 'mem_1',
          vendorId: 'vnd_1',
          revokedById: 'usr_1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('undoVendorRevocation', () => {
    it('deletes revocation record', async () => {
      mockDb.offboardingAccessRevocation.findFirst.mockResolvedValue({
        id: 'oar_1',
      });
      mockDb.offboardingAccessRevocation.delete.mockResolvedValue({});
      mockAttachmentsService.getAttachments.mockResolvedValue([]);
      // syncAccessRevocationCompletion mocks
      mockDb.offboardingChecklistTemplate.findFirst.mockResolvedValue(null);

      const result = await service.undoVendorRevocation({
        organizationId: 'org_1',
        memberId: 'mem_1',
        vendorId: 'vnd_1',
      });

      expect(
        mockDb.offboardingAccessRevocation.delete,
      ).toHaveBeenCalledWith({ where: { id: 'oar_1' } });
      expect(result.success).toBe(true);
    });

    it('throws if revocation not found', async () => {
      mockDb.offboardingAccessRevocation.findFirst.mockResolvedValue(null);

      await expect(
        service.undoVendorRevocation({
          organizationId: 'org_1',
          memberId: 'mem_1',
          vendorId: 'vnd_1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

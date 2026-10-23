import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentEntityType, db } from '@db';
import { AttachmentsService } from '../attachments/attachments.service';
import { AccessRevocationService } from './access-revocation.service';
import { DEFAULT_OFFBOARDING_CHECKLIST_ITEMS } from './default-checklist-items';

interface CompleteChecklistItemDto {
  notes?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  s3Key?: string;
}

interface UploadEvidenceDto {
  fileName: string;
  fileType: string;
  // Either inline base64 (UI/direct) or a presigned-upload s3Key (AI/MCP).
  fileData?: string;
  s3Key?: string;
  description?: string;
}

@Injectable()
export class OffboardingChecklistService {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly accessRevocationService: AccessRevocationService,
  ) {}

  async getTemplate(organizationId: string) {
    await this.seedDefaultsIfNeeded(organizationId);

    return db.offboardingChecklistTemplate.findMany({
      where: { organizationId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createTemplateItem(
    organizationId: string,
    dto: {
      title: string;
      description?: string;
      evidenceRequired?: boolean;
    },
  ) {
    const maxSortOrder = await db.offboardingChecklistTemplate.aggregate({
      where: { organizationId },
      _max: { sortOrder: true },
    });

    return db.offboardingChecklistTemplate.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        evidenceRequired: dto.evidenceRequired ?? false,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
        isDefault: false,
        isEnabled: true,
      },
    });
  }

  async updateTemplateItem(
    organizationId: string,
    templateItemId: string,
    dto: {
      title?: string;
      description?: string;
      evidenceRequired?: boolean;
      sortOrder?: number;
      isEnabled?: boolean;
    },
  ) {
    const item = await db.offboardingChecklistTemplate.findFirst({
      where: { id: templateItemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Template item not found');
    }

    return db.offboardingChecklistTemplate.update({
      where: { id: templateItemId },
      data: dto,
    });
  }

  async deleteTemplateItem(organizationId: string, templateItemId: string) {
    const item = await db.offboardingChecklistTemplate.findFirst({
      where: { id: templateItemId, organizationId },
    });

    if (!item) {
      throw new NotFoundException('Template item not found');
    }

    if (item.isDefault) {
      return db.offboardingChecklistTemplate.update({
        where: { id: templateItemId },
        data: { isEnabled: false },
      });
    }

    return db.offboardingChecklistTemplate.delete({
      where: { id: templateItemId },
    });
  }

  async getMemberChecklist(organizationId: string, memberId: string) {
    await this.seedDefaultsIfNeeded(organizationId);

    const templateItems = await db.offboardingChecklistTemplate.findMany({
      where: { organizationId, isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    const completions = await db.offboardingChecklistCompletion.findMany({
      where: { organizationId, memberId },
      include: { completedBy: { select: { id: true, name: true } } },
    });

    const completionMap = new Map(
      completions.map((c) => [c.templateItemId, c]),
    );

    const completionIds = completions.map((c) => c.id);

    const allAttachments =
      completionIds.length > 0
        ? await db.attachment.findMany({
            where: {
              organizationId,
              entityId: { in: completionIds },
              entityType: AttachmentEntityType.offboarding_checklist,
            },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const attachmentsByCompletion = new Map<string, typeof allAttachments>();
    for (const attachment of allAttachments) {
      const existing = attachmentsByCompletion.get(attachment.entityId) ?? [];
      existing.push(attachment);
      attachmentsByCompletion.set(attachment.entityId, existing);
    }

    const items = await Promise.all(
      templateItems.map(async (template) => {
        const completion = completionMap.get(template.id);
        const rawAttachments = completion
          ? (attachmentsByCompletion.get(completion.id) ?? [])
          : [];

        const evidence = await Promise.all(
          rawAttachments.map(async (attachment) => ({
            id: attachment.id,
            name: attachment.name,
            type: attachment.type,
            downloadUrl: await this.attachmentsService.getPresignedDownloadUrl(attachment.url),
            createdAt: attachment.createdAt,
          })),
        );

        return {
          ...template,
          templateItemId: template.id,
          completed: !!completion,
          isException: completion?.isException ?? false,
          exceptionReason: completion?.exceptionReason ?? null,
          completion: completion ?? null,
          evidence,
        };
      }),
    );

    return {
      items,
      totalItems: items.length,
      completedItems: items.filter((i) => i.completed).length,
    };
  }

  async completeItem({
    organizationId,
    memberId,
    templateItemId,
    completedById,
    dto,
  }: {
    organizationId: string;
    memberId: string;
    templateItemId: string;
    completedById: string;
    dto: CompleteChecklistItemDto;
  }) {
    const existing = await db.offboardingChecklistCompletion.findFirst({
      where: { organizationId, memberId, templateItemId },
    });

    if (existing) {
      throw new BadRequestException('Item is already completed');
    }

    const template = await db.offboardingChecklistTemplate.findFirst({
      where: { id: templateItemId, organizationId, isEnabled: true },
    });

    if (!template) {
      throw new NotFoundException('Template item not found');
    }

    // Evidence can arrive as inline base64 (fileData) or a presigned-upload
    // s3Key (AI/MCP clients — avoids slow base64 through an LLM).
    const hasEvidenceFile = Boolean(dto.fileData || dto.s3Key);

    if (
      template.evidenceRequired &&
      (!hasEvidenceFile || !dto.fileName || !dto.fileType)
    ) {
      throw new BadRequestException('Evidence is required to complete this item');
    }

    const completion = await db.offboardingChecklistCompletion.create({
      data: {
        organizationId,
        memberId,
        templateItemId,
        completedById,
        notes: dto.notes,
      },
    });

    if (dto.fileName && hasEvidenceFile && dto.fileType) {
      try {
        // AttachmentsService.uploadAttachment resolves the bytes from whichever
        // of fileData / s3Key is provided.
        await this.attachmentsService.uploadAttachment(
          organizationId,
          completion.id,
          AttachmentEntityType.offboarding_checklist,
          {
            fileName: dto.fileName,
            fileData: dto.fileData,
            s3Key: dto.s3Key,
            fileType: dto.fileType,
          },
          completedById,
        );
      } catch (err) {
        await db.offboardingChecklistCompletion.delete({
          where: { id: completion.id },
        });
        throw err;
      }
    }

    return completion;
  }

  async markException({
    organizationId,
    memberId,
    templateItemId,
    completedById,
    reason,
  }: {
    organizationId: string;
    memberId: string;
    templateItemId: string;
    completedById: string;
    reason: string;
  }) {
    const existing = await db.offboardingChecklistCompletion.findFirst({
      where: { organizationId, memberId, templateItemId },
    });

    if (existing) {
      throw new BadRequestException('Item is already resolved');
    }

    const template = await db.offboardingChecklistTemplate.findFirst({
      where: { id: templateItemId, organizationId, isEnabled: true },
    });

    if (!template) {
      throw new NotFoundException('Template item not found');
    }

    // The access-revocation step is driven by the per-vendor revocation flow,
    // so it can't be blanket-excepted here.
    if (template.isAccessRevocation) {
      throw new BadRequestException(
        'The access revocation step cannot be marked as an exception',
      );
    }

    // An exception resolves the step without evidence (that's the point — the
    // step could not or need not be done), so the evidenceRequired check that
    // completeItem enforces is intentionally skipped.
    return db.offboardingChecklistCompletion.create({
      data: {
        organizationId,
        memberId,
        templateItemId,
        completedById,
        isException: true,
        exceptionReason: reason.trim(),
      },
    });
  }

  async uncompleteItem({
    organizationId,
    memberId,
    templateItemId,
  }: {
    organizationId: string;
    memberId: string;
    templateItemId: string;
  }) {
    const completion = await db.offboardingChecklistCompletion.findFirst({
      where: { organizationId, memberId, templateItemId },
    });

    if (!completion) {
      throw new NotFoundException('Completion not found');
    }

    const attachments = await this.attachmentsService.getAttachments(
      organizationId,
      completion.id,
      AttachmentEntityType.offboarding_checklist,
    );

    for (const attachment of attachments) {
      await this.attachmentsService.deleteAttachment(
        organizationId,
        attachment.id,
      );
    }

    await db.offboardingChecklistCompletion.delete({
      where: { id: completion.id },
    });
  }

  async uploadEvidenceToCompletion({
    organizationId,
    memberId,
    templateItemId,
    uploadDto,
    userId,
  }: {
    organizationId: string;
    memberId: string;
    templateItemId: string;
    uploadDto: UploadEvidenceDto;
    userId: string;
  }) {
    const completion = await db.offboardingChecklistCompletion.findFirst({
      where: { organizationId, memberId, templateItemId },
    });

    if (!completion) {
      throw new BadRequestException(
        'Item must be completed before uploading evidence',
      );
    }

    return this.attachmentsService.uploadAttachment(
      organizationId,
      completion.id,
      AttachmentEntityType.offboarding_checklist,
      uploadDto,
      userId,
    );
  }

  async getAccessRevocations(organizationId: string, memberId: string) {
    return this.accessRevocationService.getAccessRevocations(
      organizationId,
      memberId,
    );
  }

  async revokeVendorAccess(params: {
    organizationId: string;
    memberId: string;
    vendorId: string;
    revokedById: string;
    notes?: string;
    evidence?: { fileName: string; fileType: string; fileData: string };
  }) {
    return this.accessRevocationService.revokeVendorAccess(params);
  }

  async undoVendorRevocation(params: {
    organizationId: string;
    memberId: string;
    vendorId: string;
  }) {
    return this.accessRevocationService.undoVendorRevocation(params);
  }

  async revokeAllVendorAccess(params: {
    organizationId: string;
    memberId: string;
    revokedById: string;
  }) {
    return this.accessRevocationService.revokeAllVendorAccess(params);
  }

  async getPendingOffboardings(organizationId: string) {
    await this.seedDefaultsIfNeeded(organizationId);

    const totalEnabled = await db.offboardingChecklistTemplate.count({
      where: { organizationId, isEnabled: true },
    });

    const offboardedMembers = await db.member.findMany({
      where: {
        organizationId,
        offboardDate: { not: null },
        deactivated: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        offboardingChecklistCompletions: {
          where: {
            templateItem: { organizationId, isEnabled: true },
          },
          select: { id: true },
        },
      },
      orderBy: { offboardDate: 'desc' },
    });

    return {
      members: offboardedMembers
        .filter((m) => m.offboardingChecklistCompletions.length < totalEnabled)
        .map((m) => ({
          memberId: m.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          offboardDate: m.offboardDate,
          completedItems: m.offboardingChecklistCompletions.length,
          totalItems: totalEnabled,
        })),
    };
  }

  private async seedDefaultsIfNeeded(organizationId: string) {
    const count = await db.offboardingChecklistTemplate.count({
      where: { organizationId },
    });

    if (count > 0) {
      return;
    }

    try {
      await db.$transaction(async (tx) => {
        const recheck = await tx.offboardingChecklistTemplate.count({
          where: { organizationId },
        });

        if (recheck > 0) {
          return;
        }

        await tx.offboardingChecklistTemplate.createMany({
          data: DEFAULT_OFFBOARDING_CHECKLIST_ITEMS.map((item) => ({
            organizationId,
            title: item.title,
            description: item.description,
            evidenceRequired: item.evidenceRequired,
          isAccessRevocation: item.isAccessRevocation,
          sortOrder: item.sortOrder,
          isDefault: true,
          isEnabled: true,
        })),
        });
      });
    } catch (err) {
      const isPrismaConflict =
        err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002';
      if (!isPrismaConflict) throw err;
    }
  }
}

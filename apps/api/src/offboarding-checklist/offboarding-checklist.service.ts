import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentEntityType, db } from '@db';
import { AttachmentsService } from '../attachments/attachments.service';
import { DEFAULT_OFFBOARDING_CHECKLIST_ITEMS } from './default-checklist-items';

interface CompleteChecklistItemDto {
  notes?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
}

interface UploadEvidenceDto {
  fileName: string;
  fileType: string;
  fileData: string;
  description?: string;
}

@Injectable()
export class OffboardingChecklistService {
  constructor(private readonly attachmentsService: AttachmentsService) {}

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

    const items = await Promise.all(
      templateItems.map(async (template) => {
        const completion = completionMap.get(template.id);
        const evidence = completion
          ? await this.attachmentsService.getAttachments(
              organizationId,
              completion.id,
              AttachmentEntityType.offboarding_checklist,
            )
          : [];

        return {
          ...template,
          completed: !!completion,
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

    const completion = await db.offboardingChecklistCompletion.create({
      data: {
        organizationId,
        memberId,
        templateItemId,
        completedById,
        notes: dto.notes,
      },
    });

    if (dto.fileName && dto.fileData && dto.fileType) {
      await this.attachmentsService.uploadAttachment(
        organizationId,
        completion.id,
        AttachmentEntityType.offboarding_checklist,
        {
          fileName: dto.fileName,
          fileData: dto.fileData,
          fileType: dto.fileType,
        },
        completedById,
      );
    }

    return completion;
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

  private async seedDefaultsIfNeeded(organizationId: string) {
    const count = await db.offboardingChecklistTemplate.count({
      where: { organizationId },
    });

    if (count > 0) {
      return;
    }

    await db.offboardingChecklistTemplate.createMany({
      data: DEFAULT_OFFBOARDING_CHECKLIST_ITEMS.map((item) => ({
        organizationId,
        title: item.title,
        description: item.description,
        evidenceRequired: item.evidenceRequired,
        sortOrder: item.sortOrder,
        isDefault: true,
        isEnabled: true,
      })),
    });
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
import { UpdateIsmsDocumentTemplateDto } from './dto/update-isms-document-template.dto';

/**
 * CRUD + framework-scoped requirement mapping for the ISMS foundational
 * document templates (CS-437). Mirrors ControlTemplateService: the 6 templates
 * are enum-fixed (seeded), so this exposes list + update + requirement
 * link/unlink rather than create/delete.
 */
@Injectable()
export class IsmsDocumentTemplateService {
  private readonly logger = new Logger(IsmsDocumentTemplateService.name);

  async findAll(frameworkId?: string) {
    return db.frameworkEditorIsmsDocumentTemplate.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        requirementLinks: {
          ...(frameworkId ? { where: { frameworkId } } : {}),
          select: {
            id: true,
            frameworkId: true,
            requirementId: true,
            requirement: {
              select: {
                id: true,
                name: true,
                identifier: true,
                framework: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateIsmsDocumentTemplateDto) {
    await this.requireTemplate(id);
    const updated = await db.frameworkEditorIsmsDocumentTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.clause !== undefined && { clause: dto.clause }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
    this.logger.log(`Updated ISMS document template: ${updated.name} (${id})`);
    return updated;
  }

  async linkRequirement({
    templateId,
    requirementId,
    frameworkId,
  }: {
    templateId: string;
    requirementId: string;
    frameworkId?: string;
  }) {
    const scopedFrameworkId = await this.ensureFrameworkScopedTemplate({
      templateId,
      frameworkId,
    });
    await this.ensureRequirement({
      requirementId,
      frameworkId: scopedFrameworkId,
    });
    await db.frameworkEditorIsmsDocumentRequirementLink.createMany({
      data: [
        {
          frameworkId: scopedFrameworkId,
          ismsDocumentTemplateId: templateId,
          requirementId,
        },
      ],
      skipDuplicates: true,
    });
    return { message: 'Requirement linked' };
  }

  async unlinkRequirement({
    templateId,
    requirementId,
    frameworkId,
  }: {
    templateId: string;
    requirementId: string;
    frameworkId?: string;
  }) {
    const scopedFrameworkId = await this.ensureFrameworkScopedTemplate({
      templateId,
      frameworkId,
    });
    await db.frameworkEditorIsmsDocumentRequirementLink.deleteMany({
      where: {
        frameworkId: scopedFrameworkId,
        ismsDocumentTemplateId: templateId,
        requirementId,
      },
    });
    return { message: 'Requirement unlinked' };
  }

  private async requireTemplate(id: string) {
    const template = await db.frameworkEditorIsmsDocumentTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!template) {
      throw new NotFoundException(`ISMS document template ${id} not found`);
    }
    return template;
  }

  private async ensureFrameworkScopedTemplate({
    templateId,
    frameworkId,
  }: {
    templateId: string;
    frameworkId?: string;
  }): Promise<string> {
    const scopedFrameworkId = await this.ensureFramework(frameworkId);
    await this.requireTemplate(templateId);
    return scopedFrameworkId;
  }

  private async ensureFramework(frameworkId?: string): Promise<string> {
    if (!frameworkId) {
      throw new BadRequestException(
        'frameworkId is required to map a requirement',
      );
    }
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
      select: { id: true },
    });
    if (!framework) throw new NotFoundException('Framework not found');
    return frameworkId;
  }

  private async ensureRequirement({
    requirementId,
    frameworkId,
  }: {
    requirementId: string;
    frameworkId: string;
  }): Promise<void> {
    const requirement = await db.frameworkEditorRequirement.findUnique({
      where: { id: requirementId },
      select: { frameworkId: true },
    });
    if (!requirement) {
      throw new NotFoundException(`Requirement ${requirementId} not found`);
    }
    if (requirement.frameworkId !== frameworkId) {
      throw new BadRequestException(
        'Requirement does not belong to the given framework',
      );
    }
  }
}

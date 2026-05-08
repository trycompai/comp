import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, PhaseCompletionType } from '@db';
import { upsertDefaultTemplate } from './timelines-template-resolver';
import {
  GENERIC_DEFAULT_TIMELINE_TEMPLATE,
  getDefaultTemplatesForFramework,
} from './default-templates';

const LEGACY_DEFAULT_TEMPLATE_NAME_BY_KEY: Record<string, string> = {
  soc2_type2_renewal: 'SOC 2 Type 2 - Year 2+',
};

@Injectable()
export class TimelinesTemplatesService {
  private async ensureCatalogTemplatesExist() {
    const frameworks = await db.frameworkEditorFramework.findMany({
      select: { id: true, name: true },
    });

    for (const framework of frameworks) {
      const defaults = getDefaultTemplatesForFramework(framework.name);

      if (defaults.length > 0) {
        for (const template of defaults) {
          const trackKey = template.trackKey ?? 'primary';
          const existing = await db.timelineTemplate.findUnique({
            where: {
              frameworkId_trackKey_cycleNumber: {
                frameworkId: framework.id,
                trackKey,
                cycleNumber: template.cycleNumber,
              },
            },
            select: {
              id: true,
              name: true,
              templateKey: true,
              nextTemplateKey: true,
            },
          });
          if (existing) {
            const expectedTemplateKey = template.templateKey ?? null;
            const expectedNextTemplateKey = template.nextTemplateKey ?? null;
            const legacyDefaultName =
              expectedTemplateKey
                ? LEGACY_DEFAULT_TEMPLATE_NAME_BY_KEY[expectedTemplateKey]
                : undefined;
            const shouldNormalizeLegacyDefaultName =
              !!legacyDefaultName &&
              existing.name === legacyDefaultName &&
              template.name !== legacyDefaultName;

            if (
              existing.templateKey !== expectedTemplateKey ||
              existing.nextTemplateKey !== expectedNextTemplateKey ||
              shouldNormalizeLegacyDefaultName
            ) {
              await db.timelineTemplate.update({
                where: { id: existing.id },
                data: {
                  ...(shouldNormalizeLegacyDefaultName
                    ? { name: template.name }
                    : {}),
                  templateKey: expectedTemplateKey,
                  nextTemplateKey: expectedNextTemplateKey,
                },
              });
            }
            continue;
          }

          await upsertDefaultTemplate(framework.id, template);
        }
        continue;
      }

      const existingGeneric = await db.timelineTemplate.findUnique({
        where: {
          frameworkId_trackKey_cycleNumber: {
            frameworkId: framework.id,
            trackKey: GENERIC_DEFAULT_TIMELINE_TEMPLATE.trackKey ?? 'primary',
            cycleNumber: GENERIC_DEFAULT_TIMELINE_TEMPLATE.cycleNumber,
          },
        },
        select: { id: true },
      });
      if (existingGeneric) continue;

      await upsertDefaultTemplate(framework.id, {
        ...GENERIC_DEFAULT_TIMELINE_TEMPLATE,
        frameworkName: framework.name,
        name: `${framework.name} Timeline`,
        phases: GENERIC_DEFAULT_TIMELINE_TEMPLATE.phases.map((phase) => ({
          ...phase,
        })),
      });
    }
  }

  async findAll() {
    await this.ensureCatalogTemplatesExist();

    return db.timelineTemplate.findMany({
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
      orderBy: [{ frameworkId: 'asc' }, { trackKey: 'asc' }, { cycleNumber: 'asc' }],
    });
  }

  async findOne(id: string) {
    const template = await db.timelineTemplate.findUnique({
      where: { id },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Timeline template not found');
    }

    return template;
  }

  async create(data: {
    frameworkId: string;
    name: string;
    cycleNumber: number;
  }) {
    return db.timelineTemplate.create({
      data: {
        frameworkId: data.frameworkId,
        name: data.name,
        cycleNumber: data.cycleNumber,
      },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });
  }

  async update(id: string, data: { name?: string; frameworkId?: string; cycleNumber?: number }) {
    const template = await db.timelineTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Timeline template not found');
    }

    return db.timelineTemplate.update({
      where: { id },
      data,
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });
  }

  async delete(id: string) {
    const template = await db.timelineTemplate.findUnique({
      where: { id },
      include: { instances: { select: { id: true }, take: 1 } },
    });

    if (!template) {
      throw new NotFoundException('Timeline template not found');
    }

    if (template.instances.length > 0) {
      throw new BadRequestException(
        'Cannot delete a template that has existing timeline instances',
      );
    }

    await db.timelineTemplate.delete({ where: { id } });
    return { success: true };
  }

  async addPhase(
    templateId: string,
    data: {
      name: string;
      description?: string;
      groupLabel?: string;
      orderIndex: number;
      defaultDurationWeeks: number;
      completionType?: PhaseCompletionType;
      locksTimelineOnComplete?: boolean;
    },
  ) {
    const template = await db.timelineTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Timeline template not found');
    }

    return db.$transaction(async (tx) => {
      await tx.timelinePhaseTemplate.updateMany({
        where: {
          templateId,
          orderIndex: { gte: data.orderIndex },
        },
        data: { orderIndex: { increment: 1 } },
      });

      return tx.timelinePhaseTemplate.create({
        data: {
          templateId,
          name: data.name,
          description: data.description,
          groupLabel: data.groupLabel,
          orderIndex: data.orderIndex,
          defaultDurationWeeks: data.defaultDurationWeeks,
          completionType: data.completionType ?? PhaseCompletionType.MANUAL,
          locksTimelineOnComplete: data.locksTimelineOnComplete ?? false,
        },
      });
    });
  }

  async updatePhase(
    templateId: string,
    phaseId: string,
    data: {
      name?: string;
      description?: string;
      groupLabel?: string;
      orderIndex?: number;
      defaultDurationWeeks?: number;
      completionType?: PhaseCompletionType;
      locksTimelineOnComplete?: boolean;
    },
  ) {
    const phase = await db.timelinePhaseTemplate.findFirst({
      where: { id: phaseId, templateId },
    });

    if (!phase) {
      throw new NotFoundException('Phase template not found');
    }

    return db.timelinePhaseTemplate.update({
      where: { id: phaseId },
      data,
    });
  }

  async deletePhase(templateId: string, phaseId: string) {
    const phase = await db.timelinePhaseTemplate.findFirst({
      where: { id: phaseId, templateId },
    });

    if (!phase) {
      throw new NotFoundException('Phase template not found');
    }

    return db.$transaction(async (tx) => {
      await tx.timelinePhaseTemplate.delete({ where: { id: phaseId } });

      // Re-index remaining phases
      const remaining = await tx.timelinePhaseTemplate.findMany({
        where: { templateId },
        orderBy: { orderIndex: 'asc' },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].orderIndex !== i) {
          await tx.timelinePhaseTemplate.update({
            where: { id: remaining[i].id },
            data: { orderIndex: i },
          });
        }
      }

      return { success: true };
    });
  }
}

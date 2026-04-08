import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, PhaseCompletionType } from '@db';

@Injectable()
export class TimelinesTemplatesService {
  async findAll() {
    return db.timelineTemplate.findMany({
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
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

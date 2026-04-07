import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  db,
  TimelineStatus,
  TimelinePhaseStatus,
  PhaseCompletionType,
} from '@db';
import { recalculatePhaseDates } from './timelines-date.helper';
import { getDefaultTemplateForCycle } from './default-templates';
import type { DefaultTimelineTemplate } from './default-templates';

@Injectable()
export class TimelinesService {
  // ---------------------------------------------------------------------------
  // Customer-facing
  // ---------------------------------------------------------------------------

  async findAllForOrganization(organizationId: string) {
    return db.timelineInstance.findMany({
      where: { organizationId },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        frameworkInstance: { include: { framework: true } },
        template: true,
      },
    });
  }

  async findOne(id: string, organizationId: string) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        frameworkInstance: { include: { framework: true } },
        template: { include: { phases: { orderBy: { orderIndex: 'asc' } } } },
      },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    return instance;
  }

  async markReadyForReview(
    instanceId: string,
    phaseId: string,
    organizationId: string,
  ) {
    const instance = await db.timelineInstance.findUnique({
      where: { id: instanceId, organizationId },
      include: {
        phases: true,
        frameworkInstance: { include: { framework: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    const phase = instance.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    if (phase.status !== TimelinePhaseStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Only in-progress phases can be marked ready for review',
      );
    }

    const updated = await db.timelinePhase.update({
      where: { id: phaseId },
      data: { readyForReview: true, readyForReviewAt: new Date() },
    });

    return {
      organization: instance.organization,
      framework: instance.frameworkInstance.framework,
      phase: updated,
    };
  }

  // ---------------------------------------------------------------------------
  // Instance lifecycle
  // ---------------------------------------------------------------------------

  async createFromTemplate({
    organizationId,
    frameworkInstanceId,
    cycleNumber,
  }: {
    organizationId: string;
    frameworkInstanceId: string;
    cycleNumber: number;
  }) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      include: { framework: true },
    });

    if (!frameworkInstance) {
      throw new NotFoundException('Framework instance not found');
    }

    // 1. Try DB template first (with cycle fallback)
    const dbTemplate = await this.findTemplateForCycle(
      frameworkInstance.frameworkId,
      cycleNumber,
    );

    if (dbTemplate) {
      return this.createInstanceFromDbTemplate({
        organizationId,
        frameworkInstanceId,
        cycleNumber,
        template: dbTemplate,
      });
    }

    // 2. Fall back to code defaults
    const codeDefault = getDefaultTemplateForCycle(
      frameworkInstance.framework.name,
      cycleNumber,
    );

    if (!codeDefault) {
      return null;
    }

    // Upsert the code default into the DB so admins can edit it later
    const upsertedTemplate = await this.upsertDefaultTemplate(
      frameworkInstance.frameworkId,
      codeDefault,
    );

    return this.createInstanceFromDbTemplate({
      organizationId,
      frameworkInstanceId,
      cycleNumber,
      template: upsertedTemplate,
    });
  }

  async activate(id: string, organizationId: string, startDate: Date) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    if (instance.status !== TimelineStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft timelines can be activated',
      );
    }

    const recalculated = recalculatePhaseDates(instance.phases, startDate);

    return db.$transaction(async (tx) => {
      for (const phase of recalculated) {
        const isFirst = phase.orderIndex === recalculated[0].orderIndex;
        await tx.timelinePhase.update({
          where: { id: phase.id },
          data: {
            startDate: phase.startDate,
            endDate: phase.endDate,
            status: isFirst
              ? TimelinePhaseStatus.IN_PROGRESS
              : TimelinePhaseStatus.PENDING,
          },
        });
      }

      return tx.timelineInstance.update({
        where: { id },
        data: { startDate, status: TimelineStatus.ACTIVE },
        include: {
          phases: { orderBy: { orderIndex: 'asc' } },
          frameworkInstance: { include: { framework: true } },
          template: true,
        },
      });
    });
  }

  async pauseTimeline(id: string, organizationId: string) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    if (instance.status !== TimelineStatus.ACTIVE) {
      throw new BadRequestException('Only active timelines can be paused');
    }

    return db.timelineInstance.update({
      where: { id },
      data: { status: TimelineStatus.PAUSED, pausedAt: new Date() },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        frameworkInstance: { include: { framework: true } },
        template: true,
      },
    });
  }

  async resumeTimeline(id: string, organizationId: string) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    if (instance.status !== TimelineStatus.PAUSED) {
      throw new BadRequestException('Only paused timelines can be resumed');
    }

    const pausedAt = instance.pausedAt;
    if (!pausedAt) {
      throw new BadRequestException('Timeline has no pause timestamp');
    }

    const pauseDurationMs = Date.now() - pausedAt.getTime();

    return db.$transaction(async (tx) => {
      // Shift non-pinned, non-completed phase dates forward by pause duration
      for (const phase of instance.phases) {
        if (phase.datesPinned) continue;
        if (phase.status === TimelinePhaseStatus.COMPLETED) continue;
        if (!phase.startDate || !phase.endDate) continue;

        await tx.timelinePhase.update({
          where: { id: phase.id },
          data: {
            startDate: new Date(phase.startDate.getTime() + pauseDurationMs),
            endDate: new Date(phase.endDate.getTime() + pauseDurationMs),
          },
        });
      }

      return tx.timelineInstance.update({
        where: { id },
        data: { status: TimelineStatus.ACTIVE, pausedAt: null },
        include: {
          phases: { orderBy: { orderIndex: 'asc' } },
          frameworkInstance: { include: { framework: true } },
          template: true,
        },
      });
    });
  }

  async completePhase(
    instanceId: string,
    phaseId: string,
    organizationId: string,
    userId?: string,
  ) {
    const instance = await db.timelineInstance.findUnique({
      where: { id: instanceId, organizationId },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    const phase = instance.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    if (phase.status === TimelinePhaseStatus.COMPLETED) {
      throw new BadRequestException('Phase is already completed');
    }

    return db.$transaction(async (tx) => {
      // Mark the phase completed
      await tx.timelinePhase.update({
        where: { id: phaseId },
        data: {
          status: TimelinePhaseStatus.COMPLETED,
          completedAt: new Date(),
          completedById: userId ?? null,
        },
      });

      // Advance next phase to IN_PROGRESS
      const nextPhase = instance.phases.find(
        (p) => p.orderIndex > phase.orderIndex &&
          p.status === TimelinePhaseStatus.PENDING,
      );

      if (nextPhase) {
        await tx.timelinePhase.update({
          where: { id: nextPhase.id },
          data: { status: TimelinePhaseStatus.IN_PROGRESS },
        });

        // Recalculate downstream dates from the completed phase's end
        if (instance.startDate) {
          const allPhases = await tx.timelinePhase.findMany({
            where: { instanceId },
            orderBy: { orderIndex: 'asc' },
          });

          const recalculated = recalculatePhaseDates(
            allPhases,
            instance.startDate,
          );

          for (const rp of recalculated) {
            if (rp.orderIndex <= phase.orderIndex) continue;
            await tx.timelinePhase.update({
              where: { id: rp.id },
              data: { startDate: rp.startDate, endDate: rp.endDate },
            });
          }
        }
      }

      // Check if all phases are completed
      const remainingPending = await tx.timelinePhase.count({
        where: {
          instanceId,
          status: { not: TimelinePhaseStatus.COMPLETED },
          id: { not: phaseId }, // exclude the one we just completed
        },
      });

      if (remainingPending === 0) {
        await tx.timelineInstance.update({
          where: { id: instanceId },
          data: {
            status: TimelineStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      return tx.timelineInstance.findUnique({
        where: { id: instanceId },
        include: {
          phases: { orderBy: { orderIndex: 'asc' } },
          frameworkInstance: { include: { framework: true } },
          template: true,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Phase editing (admin)
  // ---------------------------------------------------------------------------

  async updatePhase(
    instanceId: string,
    phaseId: string,
    organizationId: string,
    data: {
      name?: string;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      durationWeeks?: number;
      documentUrl?: string;
      documentName?: string;
    },
  ) {
    const instance = await db.timelineInstance.findUnique({
      where: { id: instanceId, organizationId },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    const phase = instance.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    // Pin dates when manually set
    const datesPinned =
      data.startDate !== undefined || data.endDate !== undefined
        ? true
        : undefined;

    const updated = await db.timelinePhase.update({
      where: { id: phaseId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.durationWeeks !== undefined && {
          durationWeeks: data.durationWeeks,
        }),
        ...(data.documentUrl !== undefined && {
          documentUrl: data.documentUrl,
        }),
        ...(data.documentName !== undefined && {
          documentName: data.documentName,
        }),
        ...(datesPinned !== undefined && { datesPinned }),
      },
    });

    // Auto-complete if documentUrl is set on an AUTO_UPLOAD phase
    if (
      data.documentUrl &&
      updated.completionType === PhaseCompletionType.AUTO_UPLOAD &&
      updated.status !== TimelinePhaseStatus.COMPLETED
    ) {
      return this.completePhase(instanceId, phaseId, organizationId);
    }

    return updated;
  }

  async addPhaseToInstance(
    instanceId: string,
    organizationId: string,
    data: {
      name: string;
      description?: string;
      orderIndex: number;
      durationWeeks: number;
      completionType?: PhaseCompletionType;
    },
  ) {
    const instance = await db.timelineInstance.findUnique({
      where: { id: instanceId, organizationId },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    return db.$transaction(async (tx) => {
      // Shift existing phases at or after the new orderIndex
      await tx.timelinePhase.updateMany({
        where: {
          instanceId,
          orderIndex: { gte: data.orderIndex },
        },
        data: { orderIndex: { increment: 1 } },
      });

      return tx.timelinePhase.create({
        data: {
          instanceId,
          name: data.name,
          description: data.description,
          orderIndex: data.orderIndex,
          durationWeeks: data.durationWeeks,
          completionType: data.completionType ?? PhaseCompletionType.MANUAL,
        },
      });
    });
  }

  async removePhaseFromInstance(
    instanceId: string,
    phaseId: string,
    organizationId: string,
  ) {
    const instance = await db.timelineInstance.findUnique({
      where: { id: instanceId, organizationId },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    const phase = instance.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    return db.$transaction(async (tx) => {
      await tx.timelinePhase.delete({ where: { id: phaseId } });

      // Re-index remaining phases
      const remaining = instance.phases
        .filter((p) => p.id !== phaseId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].orderIndex !== i) {
          await tx.timelinePhase.update({
            where: { id: remaining[i].id },
            data: { orderIndex: i },
          });
        }
      }

      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Template management (admin)
  // ---------------------------------------------------------------------------

  async findAllTemplates() {
    return db.timelineTemplate.findMany({
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        framework: true,
      },
    });
  }

  async findTemplate(id: string) {
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

  async createTemplate(data: {
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

  async updateTemplate(
    id: string,
    data: { name?: string; cycleNumber?: number },
  ) {
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

  async deleteTemplate(id: string) {
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

  async addPhaseTemplate(
    templateId: string,
    data: {
      name: string;
      description?: string;
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
          orderIndex: data.orderIndex,
          defaultDurationWeeks: data.defaultDurationWeeks,
          completionType: data.completionType ?? PhaseCompletionType.MANUAL,
        },
      });
    });
  }

  async updatePhaseTemplate(
    templateId: string,
    phaseId: string,
    data: {
      name?: string;
      description?: string;
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

  async deletePhaseTemplate(templateId: string, phaseId: string) {
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findTemplateForCycle(
    frameworkId: string,
    cycleNumber: number,
  ) {
    // Exact match first
    const exact = await db.timelineTemplate.findUnique({
      where: {
        frameworkId_cycleNumber: { frameworkId, cycleNumber },
      },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (exact) return exact;

    // Fallback: highest cycleNumber <= requested
    return db.timelineTemplate.findFirst({
      where: {
        frameworkId,
        cycleNumber: { lte: cycleNumber },
      },
      orderBy: { cycleNumber: 'desc' },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  private async upsertDefaultTemplate(
    frameworkId: string,
    defaultTemplate: DefaultTimelineTemplate,
  ) {
    return db.$transaction(async (tx) => {
      const template = await tx.timelineTemplate.upsert({
        where: {
          frameworkId_cycleNumber: {
            frameworkId,
            cycleNumber: defaultTemplate.cycleNumber,
          },
        },
        update: {},
        create: {
          frameworkId,
          name: defaultTemplate.name,
          cycleNumber: defaultTemplate.cycleNumber,
        },
        include: { phases: { orderBy: { orderIndex: 'asc' } } },
      });

      // Only seed phases if the template was just created (has no phases)
      if (template.phases.length === 0) {
        for (const phase of defaultTemplate.phases) {
          await tx.timelinePhaseTemplate.create({
            data: {
              templateId: template.id,
              name: phase.name,
              description: phase.description,
              orderIndex: phase.orderIndex,
              defaultDurationWeeks: phase.defaultDurationWeeks,
              completionType: phase.completionType,
            },
          });
        }

        return tx.timelineTemplate.findUniqueOrThrow({
          where: { id: template.id },
          include: { phases: { orderBy: { orderIndex: 'asc' } } },
        });
      }

      return template;
    });
  }

  private async createInstanceFromDbTemplate({
    organizationId,
    frameworkInstanceId,
    cycleNumber,
    template,
  }: {
    organizationId: string;
    frameworkInstanceId: string;
    cycleNumber: number;
    template: {
      id: string;
      phases: Array<{
        id: string;
        name: string;
        description: string | null;
        orderIndex: number;
        defaultDurationWeeks: number;
        completionType: PhaseCompletionType;
      }>;
    };
  }) {
    return db.$transaction(async (tx) => {
      const instance = await tx.timelineInstance.create({
        data: {
          organizationId,
          frameworkInstanceId,
          templateId: template.id,
          cycleNumber,
          status: TimelineStatus.DRAFT,
        },
      });

      for (const phase of template.phases) {
        await tx.timelinePhase.create({
          data: {
            instanceId: instance.id,
            phaseTemplateId: phase.id,
            name: phase.name,
            description: phase.description,
            orderIndex: phase.orderIndex,
            durationWeeks: phase.defaultDurationWeeks,
            completionType: phase.completionType,
          },
        });
      }

      return tx.timelineInstance.findUniqueOrThrow({
        where: { id: instance.id },
        include: {
          phases: { orderBy: { orderIndex: 'asc' } },
          frameworkInstance: { include: { framework: true } },
          template: true,
        },
      });
    });
  }
}

import { db, TimelineStatus, PhaseCompletionType } from '@db';
import { getDefaultTemplateForCycle } from './default-templates';
import type { DefaultTimelineTemplate } from './default-templates';

/**
 * Finds the best-matching DB template for a framework + cycle number.
 * Tries exact cycleNumber match first, then falls back to highest cycle <= N.
 */
export async function findTemplateForCycle(
  frameworkId: string,
  cycleNumber: number,
) {
  const exact = await db.timelineTemplate.findUnique({
    where: {
      frameworkId_cycleNumber: { frameworkId, cycleNumber },
    },
    include: { phases: { orderBy: { orderIndex: 'asc' } } },
  });

  if (exact) return exact;

  return db.timelineTemplate.findFirst({
    where: {
      frameworkId,
      cycleNumber: { lte: cycleNumber },
    },
    orderBy: { cycleNumber: 'desc' },
    include: { phases: { orderBy: { orderIndex: 'asc' } } },
  });
}

/**
 * Upserts a code-default template into the DB so it can be referenced
 * by TimelineInstance.templateId and later customized by admins.
 */
export async function upsertDefaultTemplate(
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

/**
 * Resolves a template for a given framework + cycle, checking DB first,
 * then falling back to code defaults (auto-upserting them into the DB).
 */
export async function resolveTemplate(
  frameworkId: string,
  frameworkName: string,
  cycleNumber: number,
) {
  const dbTemplate = await findTemplateForCycle(frameworkId, cycleNumber);
  if (dbTemplate) return dbTemplate;

  const codeDefault = getDefaultTemplateForCycle(frameworkName, cycleNumber);
  if (!codeDefault) return null;

  return upsertDefaultTemplate(frameworkId, codeDefault);
}

/**
 * Creates a TimelineInstance with phases copied from a resolved DB template.
 */
export async function createInstanceFromTemplate({
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

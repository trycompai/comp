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
  trackKey = 'primary',
) {
  const exact = await db.timelineTemplate.findUnique({
    where: {
      frameworkId_trackKey_cycleNumber: { frameworkId, trackKey, cycleNumber },
    },
    include: { phases: { orderBy: { orderIndex: 'asc' } } },
  });

  if (exact) return exact;

  return db.timelineTemplate.findFirst({
    where: {
      frameworkId,
      trackKey,
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
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
) {
  return db.$transaction(async (tx) => {
    const trackKey = defaultTemplate.trackKey ?? 'primary';

    const template = await tx.timelineTemplate.upsert({
      where: {
        frameworkId_trackKey_cycleNumber: {
          frameworkId,
          trackKey,
          cycleNumber: defaultTemplate.cycleNumber,
        },
      },
      update: {
        name: defaultTemplate.name,
        trackKey,
        templateKey: defaultTemplate.templateKey ?? null,
        nextTemplateKey: defaultTemplate.nextTemplateKey ?? null,
      },
      create: {
        frameworkId,
        name: defaultTemplate.name,
        trackKey,
        cycleNumber: defaultTemplate.cycleNumber,
        templateKey: defaultTemplate.templateKey,
        nextTemplateKey: defaultTemplate.nextTemplateKey,
      },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    const shouldSeedPhases = template.phases.length === 0 || forceRefresh;

    if (shouldSeedPhases) {
      // Clear existing phases if refreshing
      if (template.phases.length > 0) {
        await tx.timelinePhaseTemplate.deleteMany({
          where: { templateId: template.id },
        });
      }

      for (const phase of defaultTemplate.phases) {
        await tx.timelinePhaseTemplate.create({
          data: {
            templateId: template.id,
            name: phase.name,
            description: phase.description,
            groupLabel: phase.groupLabel,
            orderIndex: phase.orderIndex,
            defaultDurationWeeks: phase.defaultDurationWeeks,
            completionType: phase.completionType,
            locksTimelineOnComplete: phase.locksTimelineOnComplete ?? false,
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
  {
    forceRefresh = false,
    trackKey = 'primary',
  }: { forceRefresh?: boolean; trackKey?: string } = {},
) {
  if (!forceRefresh) {
    const dbTemplate = await findTemplateForCycle(frameworkId, cycleNumber, trackKey);
    if (dbTemplate) return dbTemplate;
  }

  const codeDefault = getDefaultTemplateForCycle(frameworkName, cycleNumber, {
    trackKey,
  });
  if (!codeDefault) {
    // No code default — fall back to DB even if forceRefresh
    return findTemplateForCycle(frameworkId, cycleNumber, trackKey);
  }

  return upsertDefaultTemplate(frameworkId, codeDefault, { forceRefresh });
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
    frameworkId?: string;
    trackKey?: string;
    templateKey?: string | null;
    nextTemplateKey?: string | null;
    phases: Array<{
      id: string;
      name: string;
      description: string | null;
      groupLabel: string | null;
      orderIndex: number;
      defaultDurationWeeks: number;
      completionType: PhaseCompletionType;
      locksTimelineOnComplete: boolean;
    }>;
  };
}) {
  return db.$transaction(async (tx) => {
    const instance = await tx.timelineInstance.create({
      data: {
        organizationId,
        frameworkInstanceId,
        templateId: template.id,
        trackKey: template.trackKey ?? 'primary',
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
          groupLabel: phase.groupLabel,
          orderIndex: phase.orderIndex,
          durationWeeks: phase.defaultDurationWeeks,
          completionType: phase.completionType,
          locksTimelineOnComplete: phase.locksTimelineOnComplete,
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

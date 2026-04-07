import { Logger } from '@nestjs/common';
import {
  db,
  PhaseCompletionType,
  TimelinePhaseStatus,
  TimelineStatus,
} from '@db';
import { TimelinesService } from '../timelines/timelines.service';

const logger = new Logger('FrameworksTimelineHelper');

/**
 * For each framework editor ID, look up the corresponding FrameworkInstance
 * and attempt to create a DRAFT timeline from the matching template.
 * Failures are logged but never propagate -- the framework add must succeed.
 */
export async function createTimelinesForFrameworks({
  organizationId,
  frameworkEditorIds,
  timelinesService,
}: {
  organizationId: string;
  frameworkEditorIds: string[];
  timelinesService: TimelinesService;
}) {
  const instances = await db.frameworkInstance.findMany({
    where: {
      organizationId,
      frameworkId: { in: frameworkEditorIds },
    },
    select: { id: true },
  });

  for (const instance of instances) {
    try {
      await timelinesService.createFromTemplate({
        organizationId,
        frameworkInstanceId: instance.id,
        cycleNumber: 1,
      });
    } catch (err) {
      logger.warn(
        `Failed to create timeline for framework instance ${instance.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

/**
 * Check all active timeline instances for this org. For any IN_PROGRESS
 * phase with completionType AUTO_TASKS, verify whether the linked
 * framework instance has 100% task completion and auto-complete if so.
 */
export async function checkAutoCompletePhases({
  organizationId,
  timelinesService,
}: {
  organizationId: string;
  timelinesService: TimelinesService;
}) {
  const phases = await db.timelinePhase.findMany({
    where: {
      completionType: PhaseCompletionType.AUTO_TASKS,
      status: TimelinePhaseStatus.IN_PROGRESS,
      instance: {
        organizationId,
        status: TimelineStatus.ACTIVE,
      },
    },
    include: {
      instance: {
        select: {
          id: true,
          organizationId: true,
          frameworkInstanceId: true,
        },
      },
    },
  });

  if (phases.length === 0) return;

  // Collect unique framework instance IDs
  const frameworkInstanceIds = [
    ...new Set(phases.map((p) => p.instance.frameworkInstanceId)),
  ];

  // Fetch framework instances with controls for scoring
  const frameworkInstances = await db.frameworkInstance.findMany({
    where: { id: { in: frameworkInstanceIds }, organizationId },
    include: {
      requirementsMapped: {
        include: {
          control: {
            include: {
              policies: {
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  // Deduplicate controls per framework instance
  const frameworkControlsMap = new Map<string, { id: string }[]>();
  for (const fi of frameworkInstances) {
    const controlsMap = new Map<string, { id: string }>();
    for (const rm of fi.requirementsMapped) {
      if (rm.control && !controlsMap.has(rm.control.id)) {
        controlsMap.set(rm.control.id, { id: rm.control.id });
      }
    }
    frameworkControlsMap.set(fi.id, Array.from(controlsMap.values()));
  }

  // Fetch all tasks linked to any of these controls
  const allControlIds = [
    ...new Set(
      Array.from(frameworkControlsMap.values())
        .flat()
        .map((c) => c.id),
    ),
  ];

  if (allControlIds.length === 0) return;

  const tasks = await db.task.findMany({
    where: {
      organizationId,
      controls: { some: { id: { in: allControlIds } } },
    },
    include: { controls: { select: { id: true } } },
  });

  // Check each framework instance for 100% task completion
  for (const phase of phases) {
    const fiId = phase.instance.frameworkInstanceId;
    const controls = frameworkControlsMap.get(fiId);
    if (!controls || controls.length === 0) continue;

    const controlIds = controls.map((c) => c.id);
    const fiTasks = tasks.filter((t) =>
      t.controls.some((c) => controlIds.includes(c.id)),
    );

    if (fiTasks.length === 0) continue;

    const allDone = fiTasks.every(
      (t) => t.status === 'done' || t.status === 'not_relevant',
    );

    if (!allDone) continue;

    try {
      await timelinesService.completePhase(
        phase.instance.id,
        phase.id,
        phase.instance.organizationId,
      );
    } catch (err) {
      logger.warn(
        `Auto-complete failed for phase ${phase.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

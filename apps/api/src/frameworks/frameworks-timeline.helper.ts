import { Logger } from '@nestjs/common';
import {
  db,
  FindingStatus,
  FindingType,
  PhaseCompletionType,
  TimelinePhaseStatus,
  TimelineStatus,
} from '@db';
import { TimelinesService } from '../timelines/timelines.service';
import { getOverviewScores } from './frameworks-scores.helper';

const logger = new Logger('FrameworksTimelineHelper');

type TaskForAutoCompletion = {
  id: string;
  status: string;
  controls: Array<{ id: string }>;
};

const FRAMEWORK_TO_FINDING_TYPE: Record<string, FindingType> = {
  SOC2: FindingType.soc2,
  SOC2V1: FindingType.soc2,
  ISO27001: FindingType.iso27001,
};

function getFindingTypeForFrameworkName(
  frameworkName: string | null | undefined,
): FindingType | undefined {
  if (!frameworkName) return undefined;
  const normalized = frameworkName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return FRAMEWORK_TO_FINDING_TYPE[normalized];
}

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
    select: {
      id: true,
      framework: { select: { name: true } },
    },
  });

  for (const instance of instances) {
    // Custom frameworks don't have a platform Framework record; fall back to
    // the single primary track.
    const timelinesToCreate =
      instance.framework?.name === 'SOC 2'
        ? [
            { cycleNumber: 1, trackKey: 'soc2_type1' },
            { cycleNumber: 1, trackKey: 'soc2_type2' },
          ]
        : [{ cycleNumber: 1, trackKey: 'primary' }];

    // Try each track independently so a failure on one track (e.g.
    // soc2_type1) doesn't silently skip the other (soc2_type2). Partial
    // state is also repaired on the next /timelines read via backfill.
    for (const timeline of timelinesToCreate) {
      try {
        await timelinesService.createFromTemplate({
          organizationId,
          frameworkInstanceId: instance.id,
          cycleNumber: timeline.cycleNumber,
          trackKey: timeline.trackKey,
        });
      } catch (err) {
        logger.warn(
          `Failed to create ${timeline.trackKey} timeline for framework instance ${instance.id}`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
}

/**
 * Check all active timeline instances for this org. For any IN_PROGRESS
 * AUTO_* phase, verify whether the linked auto-completion criteria
 * are satisfied and auto-complete the phase if so.
 */
export async function checkAutoCompletePhases({
  organizationId,
  timelinesService,
}: {
  organizationId: string;
  timelinesService: TimelinesService;
}) {
  try {
    await runPhaseAdvancement({ organizationId, timelinesService });
  } finally {
    // Always reconcile — handles regressions on COMPLETED phases, which
    // runPhaseAdvancement skips via its early return when no phase is
    // IN_PROGRESS. Without this, a metric drop on an already-completed
    // phase would be missed by every event hook.
    await timelinesService
      .reconcileAutoPhasesForOrganization(organizationId)
      .catch((err) =>
        logger.warn(
          'reconcileAutoPhasesForOrganization failed',
          err instanceof Error ? err.message : err,
        ),
      );
  }
}

async function runPhaseAdvancement({
  organizationId,
  timelinesService,
}: {
  organizationId: string;
  timelinesService: TimelinesService;
}) {
  const autoTypes = [
    PhaseCompletionType.AUTO_TASKS,
    PhaseCompletionType.AUTO_POLICIES,
    PhaseCompletionType.AUTO_PEOPLE,
    PhaseCompletionType.AUTO_FINDINGS,
  ];

  const phases = await db.timelinePhase.findMany({
    where: {
      completionType: { in: autoTypes },
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
          frameworkInstance: {
            select: {
              framework: {
                select: { name: true },
              },
            },
          },
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
  const frameworkControlIdsMap = new Map<string, Set<string>>();
  for (const fi of frameworkInstances) {
    const controlsMap = new Map<string, { id: string }>();
    for (const rm of fi.requirementsMapped) {
      if (rm.control && !controlsMap.has(rm.control.id)) {
        controlsMap.set(rm.control.id, { id: rm.control.id });
      }
    }
    const controls = Array.from(controlsMap.values());
    frameworkControlsMap.set(fi.id, controls);
    frameworkControlIdsMap.set(fi.id, new Set(controls.map((c) => c.id)));
  }

  // Fetch all tasks linked to any of these controls
  const allControlIds = [
    ...new Set(
      Array.from(frameworkControlsMap.values())
        .flat()
        .map((c) => c.id),
    ),
  ];

  const hasAutoFindingsPhase = phases.some(
    (phase) => phase.completionType === PhaseCompletionType.AUTO_FINDINGS,
  );

  if (allControlIds.length === 0 && !hasAutoFindingsPhase) return;

  // Fetch tasks and overview scores in parallel
  const tasksPromise: Promise<TaskForAutoCompletion[]> =
    allControlIds.length > 0
      ? db.task.findMany({
          where: {
            organizationId,
            controls: { some: { id: { in: allControlIds } } },
          },
          select: {
            id: true,
            status: true,
            controls: { select: { id: true } },
          },
        })
      : Promise.resolve([]);

  const [tasks, scores] = await Promise.all([
    tasksPromise,
    getOverviewScores(organizationId),
  ]);

  const frameworkTaskIdsMap = new Map<string, Set<string>>();
  for (const fiId of frameworkInstanceIds) {
    const controlIds = frameworkControlIdsMap.get(fiId) ?? new Set<string>();
    const taskIds = new Set<string>();
    for (const task of tasks) {
      const matchesFramework = task.controls.some((c) => controlIds.has(c.id));
      if (matchesFramework) taskIds.add(task.id);
    }
    frameworkTaskIdsMap.set(fiId, taskIds);
  }

  let findingsForAutoCompletion: Array<{
    status: FindingStatus;
    createdAt: Date;
    type: FindingType;
  }> = [];

  if (hasAutoFindingsPhase) {
    const autoFindingPhaseStartDates = phases
      .filter(
        (phase) => phase.completionType === PhaseCompletionType.AUTO_FINDINGS,
      )
      .map((phase) => phase.startDate)
      .filter((d): d is Date => d instanceof Date);
    const findingTypes = Array.from(
      new Set(
        phases
          .filter(
            (phase) =>
              phase.completionType === PhaseCompletionType.AUTO_FINDINGS,
          )
          .map((phase) =>
            getFindingTypeForFrameworkName(
              phase.instance.frameworkInstance.framework?.name,
            ),
          )
          .filter((t): t is FindingType => !!t),
      ),
    );

    if (
      autoFindingPhaseStartDates.length > 0 &&
      findingTypes.length > 0
    ) {
      const earliestStartDate = new Date(
        Math.min(...autoFindingPhaseStartDates.map((d) => d.getTime())),
      );
      findingsForAutoCompletion = await db.finding.findMany({
        where: {
          organizationId,
          createdAt: { gte: earliestStartDate },
          type: { in: findingTypes },
        },
        select: {
          status: true,
          createdAt: true,
          type: true,
        },
      });
    }
  }

  for (const phase of phases) {
    const fiId = phase.instance.frameworkInstanceId;
    const controls = frameworkControlsMap.get(fiId);
    let shouldComplete = false;

    if (phase.completionType === PhaseCompletionType.AUTO_TASKS) {
      if (!controls || controls.length === 0) continue;
      const controlIds = controls.map((c) => c.id);
      const fiTasks = tasks.filter((t) =>
        t.controls.some((c) => controlIds.includes(c.id)),
      );
      if (fiTasks.length === 0) continue;
      shouldComplete = fiTasks.every(
        (t) => t.status === 'done' || t.status === 'not_relevant',
      );
    } else if (phase.completionType === PhaseCompletionType.AUTO_POLICIES) {
      const { total, published } = scores.policies;
      shouldComplete = total > 0 && published >= total;
    } else if (phase.completionType === PhaseCompletionType.AUTO_PEOPLE) {
      const { total, completed } = scores.people;
      shouldComplete = total > 0 && completed >= total;
    } else if (phase.completionType === PhaseCompletionType.AUTO_FINDINGS) {
      if (!phase.startDate) continue;

      const phaseStartTime = phase.startDate.getTime();
      const findingType = getFindingTypeForFrameworkName(
        phase.instance.frameworkInstance.framework?.name,
      );

      if (!findingType) continue;

      const relevantFindings = findingsForAutoCompletion.filter((finding) => {
        if (finding.createdAt.getTime() < phaseStartTime) return false;
        return finding.type === findingType;
      });

      // Don't auto-complete phases where no findings were ever raised.
      if (relevantFindings.length === 0) continue;

      shouldComplete = relevantFindings.every(
        (finding) => finding.status === FindingStatus.closed,
      );
    }

    if (!shouldComplete) continue;

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

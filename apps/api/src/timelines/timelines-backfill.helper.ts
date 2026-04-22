import { db, TimelineStatus, TimelinePhaseStatus } from '@db';
import {
  resolveTemplate,
  createInstanceFromTemplate,
} from './timelines-template-resolver';
import { recalculatePhaseDates } from './timelines-date.helper';

// ---------------------------------------------------------------------------
// Framework name -> Trust field mapping
// ---------------------------------------------------------------------------

const FRAMEWORK_TRUST_MAP: Record<
  string,
  { statusField: string; trustFramework: string }
> = {
  'SOC 2': { statusField: 'soc2type2_status', trustFramework: 'soc2_type2' },
  'SOC 2 v.1': { statusField: 'soc2type1_status', trustFramework: 'soc2_type1' },
  'ISO 27001': { statusField: 'iso27001_status', trustFramework: 'iso_27001' },
  ISO27001: { statusField: 'iso27001_status', trustFramework: 'iso_27001' },
  'ISO 42001': { statusField: 'iso42001_status', trustFramework: 'iso_42001' },
  HIPAA: { statusField: 'hipaa_status', trustFramework: 'hipaa' },
  GDPR: { statusField: 'gdpr_status', trustFramework: 'gdpr' },
  'PCI DSS': { statusField: 'pci_dss_status', trustFramework: 'pci_dss' },
  'NEN 7510': { statusField: 'nen7510_status', trustFramework: 'nen_7510' },
  'ISO 9001': { statusField: 'iso9001_status', trustFramework: 'iso_9001' },
};

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface PhaseInput {
  id: string;
  orderIndex: number;
  durationWeeks: number;
  datesPinned: boolean;
  startDate: Date | null;
  endDate: Date | null;
}

interface PhaseUpdate {
  id: string;
  status: TimelinePhaseStatus;
  startDate: Date;
  endDate: Date;
  completedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Data queries
// ---------------------------------------------------------------------------

async function queryTrustData({
  organizationId,
  frameworkName,
}: {
  organizationId: string;
  frameworkName: string;
}): Promise<{ isCompliant: boolean; hasTrustResource: boolean }> {
  const mapping = FRAMEWORK_TRUST_MAP[frameworkName];
  if (!mapping) return { isCompliant: false, hasTrustResource: false };

  const [trust, trustResource] = await Promise.all([
    db.trust.findUnique({ where: { organizationId } }),
    db.trustResource.findUnique({
      where: {
        organizationId_framework: {
          organizationId,
          framework: mapping.trustFramework as never,
        },
      },
    }),
  ]);

  const statusValue = trust
    ? (trust as Record<string, unknown>)[mapping.statusField]
    : null;

  return {
    isCompliant: statusValue === 'compliant',
    hasTrustResource: !!trustResource,
  };
}

interface TaskScoreResult {
  totalTasks: number;
  allDone: boolean;
  lastTaskCompletionDate: Date | null;
}

async function queryTaskScore(
  frameworkInstanceId: string,
): Promise<TaskScoreResult> {
  const requirementMaps = await db.requirementMap.findMany({
    where: { frameworkInstanceId },
    select: { controlId: true },
    distinct: ['controlId'],
  });

  const controlIds = requirementMaps.map((rm) => rm.controlId);
  if (controlIds.length === 0) {
    return { totalTasks: 0, allDone: false, lastTaskCompletionDate: null };
  }

  const tasks = await db.task.findMany({
    where: { controls: { some: { id: { in: controlIds } } } },
    select: { id: true, status: true, updatedAt: true },
    distinct: ['id'],
  });

  const totalTasks = tasks.length;
  const completed = tasks.filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  );
  const allDone = totalTasks > 0 && completed.length === totalTasks;

  const doneOnly = completed.filter((t) => t.status === 'done');
  const lastTaskCompletionDate =
    doneOnly.length > 0
      ? doneOnly.reduce(
          (latest, t) => (t.updatedAt > latest ? t.updatedAt : latest),
          doneOnly[0].updatedAt,
        )
      : null;

  return { totalTasks, allDone, lastTaskCompletionDate };
}

// ---------------------------------------------------------------------------
// Phase status assignment
// ---------------------------------------------------------------------------

function assignCompletedPhases(
  phases: PhaseInput[],
  startDate: Date,
  completedAt: Date,
): PhaseUpdate[] {
  return recalculatePhaseDates(phases, startDate).map((p) => ({
    id: p.id,
    status: TimelinePhaseStatus.COMPLETED,
    startDate: p.startDate,
    endDate: p.endDate,
    completedAt,
  }));
}

function assignActivePhases(
  phases: PhaseInput[],
  startDate: Date,
  evidenceGatheringDone: boolean,
): PhaseUpdate[] {
  const now = new Date();
  const recalculated = recalculatePhaseDates(phases, startDate);

  if (!evidenceGatheringDone) {
    return recalculated.map((p, idx) => ({
      id: p.id,
      status: idx === 0 ? TimelinePhaseStatus.IN_PROGRESS : TimelinePhaseStatus.PENDING,
      startDate: p.startDate,
      endDate: p.endDate,
      completedAt: null,
    }));
  }

  // Evidence gathering done -- walk forward through phases
  let foundCurrent = false;
  return recalculated.map((p, idx) => {
    // First phase is always completed
    if (idx === 0) {
      const endDate = p.endDate < now ? p.endDate : now;
      return {
        id: p.id, status: TimelinePhaseStatus.COMPLETED,
        startDate: p.startDate, endDate, completedAt: endDate,
      };
    }
    if (foundCurrent) {
      return {
        id: p.id, status: TimelinePhaseStatus.PENDING,
        startDate: p.startDate, endDate: p.endDate, completedAt: null,
      };
    }
    if (p.endDate < now) {
      return {
        id: p.id, status: TimelinePhaseStatus.COMPLETED,
        startDate: p.startDate, endDate: p.endDate, completedAt: p.endDate,
      };
    }
    // Current phase
    foundCurrent = true;
    return {
      id: p.id, status: TimelinePhaseStatus.IN_PROGRESS,
      startDate: p.startDate, endDate: p.endDate, completedAt: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Shared DB update
// ---------------------------------------------------------------------------

async function applyBackfillState(
  instanceId: string,
  phaseUpdates: PhaseUpdate[],
  instanceData: { status: TimelineStatus; startDate: Date; completedAt?: Date },
) {
  await db.$transaction(async (tx) => {
    for (const phase of phaseUpdates) {
      await tx.timelinePhase.update({
        where: { id: phase.id },
        data: {
          status: phase.status,
          startDate: phase.startDate,
          endDate: phase.endDate,
          completedAt: phase.completedAt,
        },
      });
    }
    await tx.timelineInstance.update({
      where: { id: instanceId },
      data: {
        status: instanceData.status,
        startDate: instanceData.startDate,
        completedAt: instanceData.completedAt ?? null,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Main backfill function
// ---------------------------------------------------------------------------

/**
 * Frameworks that need multiple timelines per instance (e.g., SOC 2 has Type 1 + Type 2).
 * Maps framework name → array of cycle numbers to create.
 */
const MULTI_TIMELINE_FRAMEWORKS: Record<
  string,
  Array<{ cycleNumber: number; trackKey: string }>
> = {
  // Type 1 and Type 2 are independent tracks with their own cycle 1.
  'SOC 2': [
    { cycleNumber: 1, trackKey: 'soc2_type1' },
    { cycleNumber: 1, trackKey: 'soc2_type2' },
  ],
};

export async function backfillTimeline({
  organizationId,
  frameworkInstance,
  forceRefresh = false,
}: {
  organizationId: string;
  frameworkInstance: {
    id: string;
    frameworkId: string;
    framework: { id: string; name: string };
  };
  forceRefresh?: boolean;
}): Promise<void> {
  const { framework } = frameworkInstance;
  const timelinesToCreate =
    MULTI_TIMELINE_FRAMEWORKS[framework.name] ?? [
      { cycleNumber: 1, trackKey: 'primary' },
    ];

  for (const timelineToCreate of timelinesToCreate) {
    try {
      await backfillSingleTimeline({
        organizationId,
        frameworkInstance,
        cycleNumber: timelineToCreate.cycleNumber,
        trackKey: timelineToCreate.trackKey,
        forceRefresh,
      });
    } catch {
      // Non-blocking per-cycle — continue with others
    }
  }
}

async function backfillSingleTimeline({
  organizationId,
  frameworkInstance,
  cycleNumber,
  trackKey,
  forceRefresh = false,
}: {
  organizationId: string;
  frameworkInstance: {
    id: string;
    frameworkId: string;
    framework: { id: string; name: string };
  };
  cycleNumber: number;
  trackKey: string;
  forceRefresh?: boolean;
}): Promise<void> {
  const { framework } = frameworkInstance;

  // Check if this specific cycle already exists
  const existing = await db.timelineInstance.findFirst({
    where: {
      frameworkInstanceId: frameworkInstance.id,
      trackKey,
      cycleNumber,
    },
  });
  if (existing) return;

  // Step 1: Resolve and create DRAFT instance from template
  const template = await resolveTemplate(
    frameworkInstance.frameworkId,
    framework.name,
    cycleNumber,
    { forceRefresh, trackKey },
  );
  if (!template) return;

  const instance = await createInstanceFromTemplate({
    organizationId,
    frameworkInstanceId: frameworkInstance.id,
    cycleNumber,
    template,
  });

  // Step 2: Query trust + task data in parallel
  const [trustData, taskScore] = await Promise.all([
    queryTrustData({ organizationId, frameworkName: framework.name }),
    queryTaskScore(frameworkInstance.id),
  ]);

  // Infer start date from latest task completion or fall back to ~6 months ago
  const inferredStartDate =
    taskScore.lastTaskCompletionDate ??
    new Date(Date.now() - 26 * 7 * 24 * 60 * 60 * 1000);

  // Step 3: Determine state and update

  if (trustData.isCompliant || trustData.hasTrustResource) {
    const completedAt = new Date();
    await applyBackfillState(
      instance.id,
      assignCompletedPhases(instance.phases, inferredStartDate, completedAt),
      { status: TimelineStatus.COMPLETED, startDate: inferredStartDate, completedAt },
    );
    return;
  }

  if (taskScore.totalTasks > 0) {
    await applyBackfillState(
      instance.id,
      assignActivePhases(instance.phases, inferredStartDate, taskScore.allDone),
      { status: TimelineStatus.ACTIVE, startDate: inferredStartDate },
    );
    return;
  }

  // No trust data, no tasks -- keep as DRAFT (already created that way)
}

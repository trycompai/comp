import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, TimelinePhaseStatus } from '@db';
import { TimelinesLifecycleService } from './timelines-lifecycle.service';
import { backfillTimeline } from './timelines-backfill.helper';
import {
  resolveTemplate,
  createInstanceFromTemplate,
} from './timelines-template-resolver';
import { getOverviewScores } from '../frameworks/frameworks-scores.helper';

const AUTO_PHASE_TYPES = new Set([
  'AUTO_POLICIES',
  'AUTO_TASKS',
  'AUTO_PEOPLE',
]);
const AUTO_PHASE_TYPES_NO_GRACE = new Set(['AUTO_PEOPLE']);
const REGRESSION_GRACE_MS = 24 * 60 * 60 * 1000;

interface TimelinesQueryOptions {
  bypassRegressionGrace?: boolean;
}

@Injectable()
export class TimelinesService {
  constructor(
    private readonly lifecycle: TimelinesLifecycleService,
  ) {}

  // ---------------------------------------------------------------------------
  // Customer-facing queries
  // ---------------------------------------------------------------------------

  /**
   * Customer-facing read of timelines.
   *
   * Pure read (except for the one-time ensureTimelinesExist backfill). The
   * AUTO_* phase advancement + regression sync lives in
   * reconcileAutoPhasesForOrganization and fires from mutation event hooks
   * (task/policy/people/findings updates) so GET /timelines is idempotent.
   */
  async findAllForOrganization(organizationId: string) {
    await this.ensureTimelinesExist(organizationId);

    const timelines = await db.timelineInstance.findMany({
      where: { organizationId },
      include: {
        phases: { orderBy: { orderIndex: 'asc' } },
        frameworkInstance: { include: { framework: true } },
        template: true,
      },
    });

    // Enrich AUTO_* phases with live completion percentages in-memory.
    const scores = await getOverviewScores(organizationId).catch(() => null);
    if (!scores) return timelines;

    const pctMap = this.buildAutoPctMap(scores);

    for (const timeline of timelines) {
      if (timeline.status !== 'ACTIVE') continue;
      for (const phase of timeline.phases) {
        const livePct = pctMap[phase.completionType];
        if (livePct !== undefined) {
          (phase as any).completionPercent = livePct;
        }
      }
    }

    return timelines;
  }

  /**
   * Reconcile AUTO_* phase status with live metrics. Handles both directions:
   * advances phases when metrics hit 100% and reverts completed phases whose
   * metric dropped below 100% (respecting the regression grace period).
   *
   * Called from mutation hooks in tasks/policies/people/findings services
   * after events that could shift the underlying scores.
   */
  async reconcileAutoPhasesForOrganization(
    organizationId: string,
    options: TimelinesQueryOptions = {},
  ): Promise<void> {
    const scores = await getOverviewScores(organizationId).catch(() => null);
    if (!scores) return;

    const pctMap = this.buildAutoPctMap(scores);

    const fetchTimelines = () =>
      db.timelineInstance.findMany({
        where: { organizationId },
        include: { phases: { orderBy: { orderIndex: 'asc' } } },
      });

    let timelines = await fetchTimelines();

    const maxSyncPasses = 20;
    for (let pass = 0; pass < maxSyncPasses; pass++) {
      let changed = false;

      for (const timeline of timelines) {
        if (timeline.status !== 'ACTIVE' && timeline.status !== 'COMPLETED') {
          continue;
        }

        const locked =
          timeline.status === 'COMPLETED' || !!timeline.lockedAt;
        const canAutoTransition = timeline.status === 'ACTIVE' && !locked;

        for (const phase of timeline.phases) {
          if (!AUTO_PHASE_TYPES.has(phase.completionType)) continue;

          const livePct = pctMap[phase.completionType];
          if (livePct === undefined) continue;

          // Non-completed phase: clear regression flag if it somehow lingers.
          if (
            phase.status !== TimelinePhaseStatus.COMPLETED &&
            phase.regressedAt
          ) {
            await db.timelinePhase.update({
              where: { id: phase.id },
              data: { regressedAt: null },
            });
            changed = true;
            break;
          }

          if (phase.status === TimelinePhaseStatus.COMPLETED) {
            if (livePct < 100) {
              if (
                canAutoTransition &&
                (AUTO_PHASE_TYPES_NO_GRACE.has(phase.completionType) ||
                  options.bypassRegressionGrace === true)
              ) {
                await this.reopenFromRegressedPhase(
                  timeline.id,
                  phase.orderIndex,
                );
                changed = true;
                break;
              }

              if (!phase.regressedAt) {
                await db.timelinePhase.update({
                  where: { id: phase.id },
                  data: { regressedAt: new Date() },
                });
                changed = true;
                break;
              }

              if (canAutoTransition) {
                const elapsedMs =
                  Date.now() - new Date(phase.regressedAt).getTime();
                if (elapsedMs >= REGRESSION_GRACE_MS) {
                  await this.reopenFromRegressedPhase(
                    timeline.id,
                    phase.orderIndex,
                  );
                  changed = true;
                  break;
                }
              }
            } else if (phase.regressedAt) {
              await db.timelinePhase.update({
                where: { id: phase.id },
                data: { regressedAt: null },
              });
              changed = true;
              break;
            }
          }

          if (
            canAutoTransition &&
            phase.status === TimelinePhaseStatus.IN_PROGRESS &&
            livePct >= 100
          ) {
            try {
              await this.completePhase(
                timeline.id,
                phase.id,
                timeline.organizationId,
              );
              changed = true;
              break;
            } catch {
              // Phase may not be completable (e.g., prior phases not done).
            }
          }
        }

        if (changed) break;
      }

      if (!changed) break;
      timelines = await fetchTimelines();
    }
  }

  private buildAutoPctMap(scores: {
    policies: { total: number; published: number };
    tasks: { total: number; done: number };
    people: { total: number; completed: number };
  }): Record<string, number> {
    const pct = (num: number, den: number) =>
      den > 0 ? Math.round((num / den) * 100) : 0;
    return {
      AUTO_POLICIES: pct(scores.policies.published, scores.policies.total),
      AUTO_TASKS: pct(scores.tasks.done, scores.tasks.total),
      AUTO_PEOPLE: pct(scores.people.completed, scores.people.total),
    };
  }

  private async reopenFromRegressedPhase(
    timelineId: string,
    regressedOrderIndex: number,
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      const freshPhases = await tx.timelinePhase.findMany({
        where: { instanceId: timelineId },
        orderBy: { orderIndex: 'asc' },
      });

      const affected = freshPhases.filter(
        (p) => p.orderIndex >= regressedOrderIndex,
      );
      for (let i = 0; i < affected.length; i++) {
        const phase = affected[i];
        await tx.timelinePhase.update({
          where: { id: phase.id },
          data: {
            status:
              i === 0
                ? TimelinePhaseStatus.IN_PROGRESS
                : TimelinePhaseStatus.PENDING,
            completedAt: null,
            completedById: null,
            readyForReview: false,
            readyForReviewAt: null,
            regressedAt: null,
          },
        });
      }

      // If the timeline was COMPLETED, regression means it's no longer
      // complete — flip it back to ACTIVE to stay consistent with phases.
      await tx.timelineInstance.updateMany({
        where: { id: timelineId, status: 'COMPLETED' },
        data: { status: 'ACTIVE', completedAt: null },
      });
    });
  }

  /**
   * Auto-create timelines for any framework instances that don't have one yet.
   * Uses smart backfill: infers timeline state from Trust status, compliance
   * scores, and task completion data for existing orgs.
   */
  private async ensureTimelinesExist(organizationId: string) {
    const frameworkInstances = await db.frameworkInstance.findMany({
      where: { organizationId },
      include: { framework: true, timelineInstances: { select: { id: true } } },
    });

    for (const fi of frameworkInstances) {
      // Custom frameworks don't have a platform Framework record, so there's
      // no template to backfill from — skip them.
      if (!fi.frameworkId || !fi.framework) continue;
      // Always call backfillTimeline — it's idempotent per-track and repairs
      // partial state (e.g. SOC 2 with only Type 1 created, missing Type 2).
      try {
        await backfillTimeline({
          organizationId,
          frameworkInstance: {
            id: fi.id,
            frameworkId: fi.frameworkId,
            framework: fi.framework,
          },
        });
      } catch {
        // Non-blocking — don't fail the list if one timeline can't be created
      }
    }
  }

  async findOne(id: string, organizationId: string) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
      include: {
        phases: {
          orderBy: { orderIndex: 'asc' },
          include: { completedBy: { select: { id: true, name: true, email: true } } },
        },
        frameworkInstance: { include: { framework: true } },
        template: {
          include: { phases: { orderBy: { orderIndex: 'asc' } } },
        },
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

    // If already marked ready, return idempotently so retries / double-clicks
    // don't re-ping Slack for the same transition. Caller checks
    // `alreadyReady` to decide whether to fire the notification.
    if (phase.readyForReview) {
      return {
        organization: instance.organization,
        framework: instance.frameworkInstance.framework,
        phase,
        alreadyReady: true,
      };
    }

    const updated = await db.timelinePhase.update({
      where: { id: phaseId },
      data: { readyForReview: true, readyForReviewAt: new Date() },
    });

    return {
      organization: instance.organization,
      framework: instance.frameworkInstance.framework,
      phase: updated,
      alreadyReady: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Instance creation
  // ---------------------------------------------------------------------------

  async createFromTemplate({
    organizationId,
    frameworkInstanceId,
    cycleNumber,
    trackKey = 'primary',
  }: {
    organizationId: string;
    frameworkInstanceId: string;
    cycleNumber: number;
    trackKey?: string;
  }) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      include: { framework: true },
    });

    if (!frameworkInstance) {
      throw new NotFoundException('Framework instance not found');
    }

    // Timelines are only created for platform frameworks; custom frameworks
    // don't have pre-built templates.
    if (!frameworkInstance.frameworkId || !frameworkInstance.framework) {
      return null;
    }

    const template = await resolveTemplate(
      frameworkInstance.frameworkId,
      frameworkInstance.framework.name,
      cycleNumber,
      { trackKey },
    );

    if (!template) {
      return null;
    }

    return createInstanceFromTemplate({
      organizationId,
      frameworkInstanceId,
      cycleNumber,
      template,
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle delegates — exposed for controllers
  // ---------------------------------------------------------------------------

  async activate(id: string, organizationId: string, startDate: Date) {
    return this.lifecycle.activate(id, organizationId, startDate);
  }

  async pauseTimeline(id: string, organizationId: string) {
    return this.lifecycle.pause(id, organizationId);
  }

  async resumeTimeline(id: string, organizationId: string) {
    return this.lifecycle.resume(id, organizationId);
  }

  async completePhase(
    instanceId: string,
    phaseId: string,
    organizationId: string,
    userId?: string,
  ) {
    return this.lifecycle.completePhase(
      instanceId,
      phaseId,
      organizationId,
      userId,
    );
  }

  async unlockTimeline(
    id: string,
    organizationId: string,
    unlockedById: string,
    unlockReason: string,
  ) {
    return this.lifecycle.unlock(id, organizationId, unlockedById, unlockReason);
  }

  // ---------------------------------------------------------------------------
  // Admin — next cycle, delete, reset, recreate
  // ---------------------------------------------------------------------------

  async startNextCycle(id: string, organizationId: string) {
    const current = await this.findOne(id, organizationId);

    if (current.status !== 'COMPLETED') {
      throw new BadRequestException('Timeline must be completed to start the next cycle');
    }

    const nextCycleNumber = current.cycleNumber + 1;
    const currentTrackKey =
      current.trackKey ?? current.template?.trackKey ?? 'primary';

    // Check if next cycle already exists
    const existing = await db.timelineInstance.findFirst({
      where: {
        frameworkInstanceId: current.frameworkInstanceId,
        trackKey: currentTrackKey,
        cycleNumber: nextCycleNumber,
      },
    });

    if (existing) {
      throw new BadRequestException(`Cycle ${nextCycleNumber} already exists for this framework`);
    }

    // Prefer explicit template progression when configured.
    const nextTemplateKey = current.template?.nextTemplateKey ?? null;
    const templateFrameworkId = current.template?.frameworkId ?? null;

    if (nextTemplateKey && templateFrameworkId) {
      const progressedTemplate = await db.timelineTemplate.findUnique({
        where: {
          frameworkId_templateKey: {
            frameworkId: templateFrameworkId,
            templateKey: nextTemplateKey,
          },
        },
        include: { phases: { orderBy: { orderIndex: 'asc' } } },
      });

      if (progressedTemplate) {
        return createInstanceFromTemplate({
          organizationId,
          frameworkInstanceId: current.frameworkInstanceId,
          cycleNumber: nextCycleNumber,
          template: progressedTemplate,
        });
      }
    }

    return this.createFromTemplate({
      organizationId,
      frameworkInstanceId: current.frameworkInstanceId,
      cycleNumber: nextCycleNumber,
      trackKey: currentTrackKey,
    });
  }

  async deleteInstance(id: string, organizationId: string) {
    const instance = await db.timelineInstance.findFirst({
      where: { id, organizationId },
    });
    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }
    await db.timelinePhase.deleteMany({ where: { instanceId: id } });
    await db.timelineInstance.delete({ where: { id } });
    return { deleted: true };
  }

  async resetInstance(id: string, organizationId: string) {
    const instance = await this.findOne(id, organizationId);
    await db.$transaction(async (tx) => {
      for (const phase of instance.phases) {
        await tx.timelinePhase.update({
          where: { id: phase.id },
          data: {
            status: 'PENDING',
            startDate: null,
            endDate: null,
            completedAt: null,
            completedById: null,
            readyForReview: false,
            readyForReviewAt: null,
            datesPinned: false,
            regressedAt: null,
          },
        });
      }
      await tx.timelineInstance.update({
        where: { id },
        data: {
          status: 'DRAFT',
          startDate: null,
          pausedAt: null,
          lockedAt: null,
          lockedById: null,
          unlockedAt: null,
          unlockedById: null,
          unlockReason: null,
          completedAt: null,
        },
      });
    });
    return this.findOne(id, organizationId);
  }

  async recreateAllForOrganization(organizationId: string) {
    // Delete all existing timeline instances for this org
    const existing = await db.timelineInstance.findMany({
      where: { organizationId },
      select: { id: true },
    });
    for (const inst of existing) {
      await db.timelinePhase.deleteMany({ where: { instanceId: inst.id } });
    }
    await db.timelineInstance.deleteMany({ where: { organizationId } });

    // Re-run backfill with forceRefresh to update templates from latest code defaults
    const frameworkInstances = await db.frameworkInstance.findMany({
      where: { organizationId },
      include: { framework: true, timelineInstances: { select: { id: true } } },
    });

    for (const fi of frameworkInstances) {
      // Skip custom frameworks — no template to backfill from.
      if (!fi.frameworkId || !fi.framework) continue;
      try {
        await backfillTimeline({
          organizationId,
          frameworkInstance: {
            id: fi.id,
            frameworkId: fi.frameworkId,
            framework: fi.framework,
          },
          forceRefresh: true,
        });
      } catch {
        // Non-blocking
      }
    }

    // After a full recreate, immediately reconcile AUTO phases against live
    // metrics (bypassing regression grace) so the returned state is fresh.
    await this.reconcileAutoPhasesForOrganization(organizationId, {
      bypassRegressionGrace: true,
    });

    return this.findAllForOrganization(organizationId);
  }
}

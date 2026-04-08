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

@Injectable()
export class TimelinesService {
  constructor(
    private readonly lifecycle: TimelinesLifecycleService,
  ) {}

  // ---------------------------------------------------------------------------
  // Customer-facing queries
  // ---------------------------------------------------------------------------

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

    // Compute live completion percentages for AUTO_* phases
    const scores = await getOverviewScores(organizationId).catch(() => null);
    if (!scores) return timelines;

    const policyPct = scores.policies.total > 0
      ? Math.round((scores.policies.published / scores.policies.total) * 100)
      : 0;
    const taskPct = scores.tasks.total > 0
      ? Math.round((scores.tasks.done / scores.tasks.total) * 100)
      : 0;
    const peoplePct = scores.people.total > 0
      ? Math.round((scores.people.completed / scores.people.total) * 100)
      : 0;

    const pctMap: Record<string, number> = {
      AUTO_POLICIES: policyPct,
      AUTO_TASKS: taskPct,
      AUTO_PEOPLE: peoplePct,
    };

    // Revert completed AUTO_* phases that dropped below 100%, and enrich with live %
    for (const timeline of timelines) {
      if (timeline.status !== 'ACTIVE') continue;

      for (const phase of timeline.phases) {
        const livePct = pctMap[phase.completionType];
        if (livePct === undefined) continue;

        // Attach live percentage (cast to add dynamic property)
        (phase as any).completionPercent = livePct;

        // Revert if completed but metric dropped
        if (phase.status === 'COMPLETED' && livePct < 100) {
          await db.timelinePhase.update({
            where: { id: phase.id },
            data: { status: 'IN_PROGRESS', completedAt: null, completedById: null },
          });
          (phase as any).status = 'IN_PROGRESS';
          (phase as any).completedAt = null;
        }
      }
    }

    return timelines;
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
      if (fi.timelineInstances.length > 0) continue;
      try {
        await backfillTimeline({
          organizationId,
          frameworkInstance: fi,
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
  // Instance creation
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

    const template = await resolveTemplate(
      frameworkInstance.frameworkId,
      frameworkInstance.framework.name,
      cycleNumber,
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

  // ---------------------------------------------------------------------------
  // Admin — delete, reset, recreate
  // ---------------------------------------------------------------------------

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
          },
        });
      }
      await tx.timelineInstance.update({
        where: { id },
        data: { status: 'DRAFT', startDate: null, pausedAt: null, completedAt: null },
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
      try {
        await backfillTimeline({
          organizationId,
          frameworkInstance: fi,
          forceRefresh: true,
        });
      } catch {
        // Non-blocking
      }
    }

    return this.findAllForOrganization(organizationId);
  }
}

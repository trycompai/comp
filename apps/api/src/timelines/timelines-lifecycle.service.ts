import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, TimelineStatus, TimelinePhaseStatus } from '@db';
import { recalculatePhaseDates } from './timelines-date.helper';
import { notifyPhaseCompleted, notifyTimelineCompleted } from './timelines-slack.helper';

/** Shared Prisma include for timeline instance queries. */
const INSTANCE_INCLUDE = {
  phases: { orderBy: { orderIndex: 'asc' } as const },
  frameworkInstance: { include: { framework: true } },
  organization: { select: { id: true, name: true } },
  template: true,
};

@Injectable()
export class TimelinesLifecycleService {
  async activate(id: string, organizationId: string, startDate: Date) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
      include: { phases: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    if (instance.status !== TimelineStatus.DRAFT) {
      throw new BadRequestException('Only draft timelines can be activated');
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
        include: INSTANCE_INCLUDE,
      });
    });
  }

  async pause(id: string, organizationId: string) {
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
      include: INSTANCE_INCLUDE,
    });
  }

  async resume(id: string, organizationId: string) {
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
        include: INSTANCE_INCLUDE,
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

    if (phase.status !== TimelinePhaseStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress phases can be completed');
    }

    const hasIncompletePrior = instance.phases
      .filter((p) => p.orderIndex < phase.orderIndex)
      .some((p) => p.status !== TimelinePhaseStatus.COMPLETED);

    if (hasIncompletePrior) {
      throw new BadRequestException(
        'Cannot complete phase before prior phases are completed',
      );
    }

    const txResult = await db.$transaction(async (tx) => {
      const now = new Date();
      let lockApplied = false;

      // If completing before planned end, update endDate and pin it
      // so downstream recalculation anchors off the actual completion date
      const finishedEarly = !phase.endDate || now.getTime() < new Date(phase.endDate).getTime();

      await tx.timelinePhase.update({
        where: { id: phaseId },
        data: {
          status: TimelinePhaseStatus.COMPLETED,
          completedAt: now,
          completedById: userId ?? null,
          ...(finishedEarly ? { endDate: now, datesPinned: true } : {}),
        },
      });

      if (phase.locksTimelineOnComplete && !instance.lockedAt) {
        await tx.timelineInstance.update({
          where: { id: instanceId },
          data: {
            lockedAt: now,
            lockedById: userId ?? null,
            unlockedAt: null,
            unlockedById: null,
            unlockReason: null,
          },
        });
        lockApplied = true;
      }

      // Advance next pending phase to IN_PROGRESS — but only if all prior phases are completed
      const freshPhases = await tx.timelinePhase.findMany({
        where: { instanceId },
        orderBy: { orderIndex: 'asc' },
      });

      const nextPhase = freshPhases.find(
        (p) => p.status === TimelinePhaseStatus.PENDING,
      );

      const allPriorCompleted = nextPhase
        ? freshPhases
            .filter((p) => p.orderIndex < nextPhase.orderIndex)
            .every((p) => p.status === TimelinePhaseStatus.COMPLETED)
        : false;

      if (nextPhase && allPriorCompleted) {
        await tx.timelinePhase.update({
          where: { id: nextPhase.id },
          data: { status: TimelinePhaseStatus.IN_PROGRESS },
        });

        // Recalculate downstream dates
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

      // Check if all phases are now completed
      const remainingPending = await tx.timelinePhase.count({
        where: {
          instanceId,
          status: { not: TimelinePhaseStatus.COMPLETED },
          id: { not: phaseId },
        },
      });

      const allCompleted = remainingPending === 0;

      if (allCompleted) {
        await tx.timelineInstance.update({
          where: { id: instanceId },
          data: {
            status: TimelineStatus.COMPLETED,
            completedAt: now,
            ...(!instance.lockedAt && !lockApplied
              ? {
                  lockedAt: now,
                  lockedById: userId ?? null,
                  unlockedAt: null,
                  unlockedById: null,
                  unlockReason: null,
                }
              : {}),
          },
        });
      }

      const result = await tx.timelineInstance.findUnique({
        where: { id: instanceId },
        include: INSTANCE_INCLUDE,
      });

      return { result, allCompleted, phaseName: phase.name, completionType: phase.completionType };
    });

    // Fire-and-forget Slack notifications
    const orgName = txResult.result?.organization?.name ?? organizationId;
    const frameworkName =
      txResult.result?.template?.name ??
      txResult.result?.frameworkInstance?.framework?.name ??
      'Unknown';

    notifyPhaseCompleted({
      orgId: organizationId,
      orgName,
      frameworkName,
      phaseName: txResult.phaseName,
      completionType: txResult.completionType,
    });

    if (txResult.allCompleted) {
      notifyTimelineCompleted({ orgId: organizationId, orgName, frameworkName });
    }

    return txResult.result;
  }

  async unlock(
    id: string,
    organizationId: string,
    unlockedById: string,
    unlockReason: string,
  ) {
    const instance = await db.timelineInstance.findUnique({
      where: { id, organizationId },
    });

    if (!instance) {
      throw new NotFoundException('Timeline instance not found');
    }

    if (instance.status === TimelineStatus.COMPLETED) {
      throw new BadRequestException('Completed timelines cannot be unlocked');
    }

    if (!instance.lockedAt) {
      throw new BadRequestException('Timeline is not locked');
    }

    return db.timelineInstance.update({
      where: { id },
      data: {
        lockedAt: null,
        lockedById: null,
        unlockedAt: new Date(),
        unlockedById,
        unlockReason,
      },
      include: INSTANCE_INCLUDE,
    });
  }
}

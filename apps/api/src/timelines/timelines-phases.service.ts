import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, PhaseCompletionType } from '@db';
import { TimelinesLifecycleService } from './timelines-lifecycle.service';
import { recalculatePhaseDates } from './timelines-date.helper';

@Injectable()
export class TimelinesPhasesService {
  constructor(
    private readonly lifecycle: TimelinesLifecycleService,
  ) {}

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
      datesPinned?: boolean;
      completionType?: PhaseCompletionType;
      documentUrl?: string;
      documentName?: string;
      locksTimelineOnComplete?: boolean;
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

    // Resolve the effective endDate: prefer an explicit endDate from the
    // caller, otherwise compute from startDate + duration when either changed.
    const newDuration = data.durationWeeks ?? phase.durationWeeks;
    const newStartDate = data.startDate ?? phase.startDate;
    let newEndDate: Date | undefined = data.endDate;

    if (newEndDate === undefined && (data.startDate || data.durationWeeks)) {
      if (newStartDate) {
        const end = new Date(newStartDate);
        end.setUTCDate(end.getUTCDate() + newDuration * 7);
        newEndDate = end;
      }
    }

    // Pin dates when the caller explicitly sets any date field. If the user
    // sets a date AND explicitly asks to unpin, the pin wins — storing a
    // specific date with datesPinned=false would desynchronize this phase
    // from the downstream recalc anchor and allow the next refresh to
    // overwrite it. An explicit un-pin is only honored when no date field
    // is provided in the same call.
    const datesPinned =
      data.startDate !== undefined || data.endDate !== undefined
        ? true
        : data.datesPinned;

    const updated = await db.timelinePhase.update({
      where: { id: phaseId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.durationWeeks !== undefined && { durationWeeks: data.durationWeeks }),
        ...(data.completionType !== undefined && {
          completionType: data.completionType,
        }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(newEndDate !== undefined && { endDate: newEndDate }),
        ...(data.documentUrl !== undefined && { documentUrl: data.documentUrl }),
        ...(data.documentName !== undefined && { documentName: data.documentName }),
        ...(datesPinned !== undefined && { datesPinned }),
        ...(data.locksTimelineOnComplete !== undefined && {
          locksTimelineOnComplete: data.locksTimelineOnComplete,
        }),
      },
    });

    // Recalculate downstream phases when dates change
    if (newEndDate && instance.startDate) {
      const allPhases = await db.timelinePhase.findMany({
        where: { instanceId },
        orderBy: { orderIndex: 'asc' },
      });
      const recalculated = recalculatePhaseDates(allPhases, instance.startDate);
      for (const rp of recalculated) {
        if (rp.id === phaseId) continue; // already updated
        if (rp.datesPinned || rp.status === 'COMPLETED') continue;
        await db.timelinePhase.update({
          where: { id: rp.id },
          data: { startDate: rp.startDate, endDate: rp.endDate },
        });
      }
    }

    // Auto-complete if documentUrl is set on an AUTO_UPLOAD phase
    if (
      data.documentUrl &&
      updated.completionType === PhaseCompletionType.AUTO_UPLOAD &&
      !instance.lockedAt &&
      updated.status !== 'COMPLETED'
    ) {
      return this.lifecycle.completePhase(instanceId, phaseId, organizationId);
    }

    return updated;
  }

  async addPhase(
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

  async removePhase(
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
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, TimelinePhaseStatus } from '@db';
import {
  resolveTemplate,
  createInstanceFromTemplate,
} from './timelines-template-resolver';
import { TimelinesLifecycleService } from './timelines-lifecycle.service';

@Injectable()
export class TimelinesService {
  constructor(
    private readonly lifecycle: TimelinesLifecycleService,
  ) {}

  // ---------------------------------------------------------------------------
  // Customer-facing queries
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
}

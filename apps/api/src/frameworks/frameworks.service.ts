import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import {
  getOverviewScores,
  getCurrentMember,
  computeFrameworkComplianceScore,
} from './frameworks-scores.helper';
import { upsertOrgFrameworkStructure } from './frameworks-upsert.helper';

@Injectable()
export class FrameworksService {
  async findAll(
    organizationId: string,
    options?: { includeControls?: boolean; includeScores?: boolean },
  ) {
    const includeControls = options?.includeControls ?? false;
    const includeScores = options?.includeScores ?? false;

    const frameworkInstances = await db.frameworkInstance.findMany({
      where: { organizationId },
      include: {
        framework: true,
        ...(includeControls && {
          requirementsMapped: {
            include: {
              control: {
                include: {
                  policies: {
                    select: { id: true, name: true, status: true },
                  },
                  requirementsMapped: true,
                },
              },
            },
          },
        }),
      },
    });

    if (!includeControls) {
      return frameworkInstances;
    }

    // Deduplicate controls from requirementsMapped
    const frameworksWithControls = frameworkInstances.map((fi: any) => {
      const controlsMap = new Map<string, any>();
      for (const rm of fi.requirementsMapped || []) {
        if (rm.control && !controlsMap.has(rm.control.id)) {
          const { requirementsMapped: _, ...controlData } = rm.control;
          controlsMap.set(rm.control.id, {
            ...controlData,
            policies: rm.control.policies || [],
            requirementsMapped: rm.control.requirementsMapped || [],
          });
        }
      }
      const { requirementsMapped: _, ...rest } = fi;
      return { ...rest, controls: Array.from(controlsMap.values()) };
    });

    if (!includeScores) {
      return frameworksWithControls;
    }

    // Fetch tasks for scoring
    const tasks = await db.task.findMany({
      where: {
        organizationId,
        controls: { some: { organizationId } },
      },
      include: { controls: true },
    });

    return frameworksWithControls.map((fw: any) => ({
      ...fw,
      complianceScore: computeFrameworkComplianceScore(fw, tasks),
    }));
  }

  async findOne(frameworkInstanceId: string, organizationId: string) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      include: {
        framework: true,
        requirementsMapped: {
          include: {
            control: {
              include: {
                policies: {
                  select: { id: true, name: true, status: true },
                },
                requirementsMapped: true,
              },
            },
          },
        },
      },
    });

    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    // Deduplicate controls
    const controlsMap = new Map<string, any>();
    for (const rm of fi.requirementsMapped) {
      if (rm.control && !controlsMap.has(rm.control.id)) {
        const { requirementsMapped: _, ...controlData } = rm.control;
        controlsMap.set(rm.control.id, {
          ...controlData,
          policies: rm.control.policies || [],
          requirementsMapped: rm.control.requirementsMapped || [],
        });
      }
    }
    const { requirementsMapped: _, ...rest } = fi;

    // Fetch additional data
    const [requirementDefinitions, tasks, requirementMaps] =
      await Promise.all([
        db.frameworkEditorRequirement.findMany({
          where: { frameworkId: fi.frameworkId },
          orderBy: { name: 'asc' },
        }),
        db.task.findMany({
          where: { organizationId, controls: { some: { organizationId } } },
          include: { controls: true },
        }),
        db.requirementMap.findMany({
          where: { frameworkInstanceId },
          include: { control: true },
        }),
      ]);

    return {
      ...rest,
      controls: Array.from(controlsMap.values()),
      requirementDefinitions,
      tasks,
      requirementMaps,
    };
  }

  async findAvailable() {
    const frameworks = await db.frameworkEditorFramework.findMany({
      where: { visible: true },
      include: { requirements: true },
    });
    return frameworks;
  }

  async getScores(organizationId: string, userId: string) {
    const [scores, currentMember] = await Promise.all([
      getOverviewScores(organizationId),
      getCurrentMember(organizationId, userId),
    ]);
    return { ...scores, currentMember };
  }

  async addFrameworks(
    organizationId: string,
    frameworkIds: string[],
  ) {
    const result = await db.$transaction(async (tx) => {
      const frameworks = await tx.frameworkEditorFramework.findMany({
        where: { id: { in: frameworkIds }, visible: true },
        include: { requirements: true },
      });

      if (frameworks.length === 0) {
        throw new BadRequestException(
          'No valid or visible frameworks found for the provided IDs.',
        );
      }

      const finalIds = frameworks.map((f) => f.id);

      await upsertOrgFrameworkStructure({
        organizationId,
        targetFrameworkEditorIds: finalIds,
        frameworkEditorFrameworks: frameworks,
        tx,
      });

      return { success: true, frameworksAdded: finalIds.length };
    });

    return result;
  }

  async findRequirement(
    frameworkInstanceId: string,
    requirementKey: string,
    organizationId: string,
  ) {
    const fi = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
      select: { id: true, frameworkId: true },
    });

    if (!fi) {
      throw new NotFoundException('Framework instance not found');
    }

    const [allReqDefs, relatedControls, tasks] = await Promise.all([
      db.frameworkEditorRequirement.findMany({
        where: { frameworkId: fi.frameworkId },
      }),
      db.requirementMap.findMany({
        where: { frameworkInstanceId, requirementId: requirementKey },
        include: {
          control: {
            include: {
              policies: {
                select: { id: true, name: true, status: true },
              },
            },
          },
        },
      }),
      db.task.findMany({
        where: { organizationId },
        include: { controls: true },
      }),
    ]);

    const requirement = allReqDefs.find((r) => r.id === requirementKey);
    if (!requirement) {
      throw new NotFoundException('Requirement not found');
    }

    const siblingRequirements = allReqDefs
      .filter((r) => r.id !== requirementKey)
      .map((r) => ({ id: r.id, name: r.name }));

    return {
      requirement,
      relatedControls,
      tasks,
      siblingRequirements,
    };
  }

  async delete(frameworkInstanceId: string, organizationId: string) {
    const frameworkInstance = await db.frameworkInstance.findUnique({
      where: { id: frameworkInstanceId, organizationId },
    });

    if (!frameworkInstance) {
      throw new NotFoundException('Framework instance not found');
    }

    await db.frameworkInstance.delete({
      where: { id: frameworkInstanceId },
    });

    return { success: true };
  }
}

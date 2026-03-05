import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, Prisma } from '@trycompai/db';
import { CreateControlDto } from './dto/create-control.dto';

const controlInclude = {
  policies: {
    select: { status: true, id: true, name: true },
  },
  tasks: {
    select: { id: true, title: true, status: true },
  },
  requirementsMapped: {
    include: {
      frameworkInstance: {
        include: { framework: true },
      },
      requirement: {
        select: { name: true, identifier: true },
      },
    },
  },
} satisfies Prisma.ControlInclude;

@Injectable()
export class ControlsService {
  async findAll(
    organizationId: string,
    options: {
      page: number;
      perPage: number;
      name?: string;
      sortBy?: string;
      sortDesc?: boolean;
    },
  ) {
    const where: Prisma.ControlWhereInput = {
      organizationId,
      ...(options.name && {
        name: { contains: options.name, mode: Prisma.QueryMode.insensitive },
      }),
    };

    const orderBy: any = options.sortBy
      ? { [options.sortBy]: options.sortDesc ? 'desc' : 'asc' }
      : { name: 'asc' };

    const [controls, total] = await Promise.all([
      db.control.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.perPage,
        take: options.perPage,
        include: controlInclude,
      }),
      db.control.count({ where }),
    ]);

    return {
      data: controls,
      pageCount: Math.ceil(total / options.perPage),
    };
  }

  async findOne(controlId: string, organizationId: string) {
    const control = await db.control.findUnique({
      where: { id: controlId, organizationId },
      include: {
        policies: true,
        tasks: true,
        requirementsMapped: {
          include: {
            frameworkInstance: {
              include: { framework: true },
            },
            requirement: true,
          },
        },
      },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    // Compute progress
    const policies = control.policies || [];
    const tasks = control.tasks || [];
    const totalItems = policies.length + tasks.length;

    let policyCompleted = 0;
    let taskCompleted = 0;

    for (const p of policies) {
      if (p.status === 'published') policyCompleted++;
    }
    for (const t of tasks) {
      if (t.status === 'done' || t.status === 'not_relevant') taskCompleted++;
    }

    const completed = policyCompleted + taskCompleted;

    return {
      ...control,
      progress: {
        total: totalItems,
        completed,
        progress: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
        byType: {
          policy: { total: policies.length, completed: policyCompleted },
          task: { total: tasks.length, completed: taskCompleted },
        },
      },
    };
  }

  async getOptions(organizationId: string) {
    const [policies, tasks, frameworkInstances] = await Promise.all([
      db.policy.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      db.task.findMany({
        where: { organizationId },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
      }),
      db.frameworkInstance.findMany({
        where: { organizationId },
        include: {
          framework: {
            include: {
              requirements: {
                select: { id: true, name: true, identifier: true },
              },
            },
          },
        },
      }),
    ]);

    const requirements = frameworkInstances.flatMap((fi) =>
      fi.framework.requirements.map((req) => ({
        id: req.id,
        name: req.name,
        identifier: req.identifier,
        frameworkInstanceId: fi.id,
        frameworkName: fi.framework.name,
      })),
    );

    return { policies, tasks, requirements };
  }

  async create(organizationId: string, dto: CreateControlDto) {
    const { name, description, policyIds, taskIds, requirementMappings } = dto;

    const control = await db.control.create({
      data: {
        name,
        description,
        organizationId,
        ...(policyIds &&
          policyIds.length > 0 && {
            policies: {
              connect: policyIds.map((id) => ({ id })),
            },
          }),
        ...(taskIds &&
          taskIds.length > 0 && {
            tasks: {
              connect: taskIds.map((id) => ({ id })),
            },
          }),
      },
    });

    if (requirementMappings && requirementMappings.length > 0) {
      await Promise.all(
        requirementMappings.map((mapping) =>
          db.requirementMap.create({
            data: {
              controlId: control.id,
              requirementId: mapping.requirementId,
              frameworkInstanceId: mapping.frameworkInstanceId,
            },
          }),
        ),
      );
    }

    return control;
  }

  async delete(controlId: string, organizationId: string) {
    const control = await db.control.findUnique({
      where: {
        id: controlId,
        organizationId,
      },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    await db.control.delete({
      where: { id: controlId },
    });

    return { success: true };
  }
}

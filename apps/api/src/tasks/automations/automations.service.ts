import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db, Prisma } from '@db';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@Injectable()
export class AutomationsService {
  async findByTaskId(taskId: string) {
    const automations = await db.evidenceAutomation.findMany({
      where: {
        taskId: taskId,
      },
      include: {
        runs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      automations,
    };
  }

  async findById(automationId: string) {
    const automation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
      },
    });

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    return {
      success: true,
      automation,
    };
  }

  async create(organizationId: string, taskId: string) {
    // Verify task exists and belongs to organization
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        organizationId: organizationId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Create the automation
    const automation = await db.evidenceAutomation.create({
      data: {
        name: `${task.title} - Evidence Collection`,
        taskId: taskId,
      },
    });

    return {
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
      },
    };
  }

  async update(automationId: string, updateAutomationDto: UpdateAutomationDto) {
    // Verify automation exists and belongs to organization
    const existingAutomation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
      },
    });

    if (!existingAutomation) {
      throw new NotFoundException('Automation not found');
    }

    const { scheduleFrequency, ...rest } = updateAutomationDto;

    // Update the automation
    const automation = await db.evidenceAutomation.update({
      where: {
        id: automationId,
      },
      data: {
        ...rest,
        ...(scheduleFrequency !== undefined ? { scheduleFrequency } : {}),
      },
    });

    return {
      success: true,
      automation: {
        id: automation.id,
        name: automation.name,
        description: automation.description,
      },
    };
  }

  async delete(automationId: string) {
    // Verify automation exists and belongs to organization
    const existingAutomation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
      },
    });

    if (!existingAutomation) {
      throw new NotFoundException('Automation not found');
    }

    // Delete the automation
    await db.evidenceAutomation.delete({
      where: {
        id: automationId,
      },
    });

    return {
      success: true,
      message: 'Automation deleted successfully',
    };
  }

  async createVersion(automationId: string, data: CreateVersionDto) {
    try {
      const [version] = await db.$transaction([
        db.evidenceAutomationVersion.create({
          data: {
            evidenceAutomationId: automationId,
            version: data.version,
            scriptKey: data.scriptKey,
            changelog: data.changelog,
          },
        }),
        // Enable automation on publish if not already enabled
        db.evidenceAutomation.update({
          where: { id: automationId },
          data: { isEnabled: true },
        }),
      ]);
      return { success: true, version };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Duplicate (evidenceAutomationId, version) — version already published.
        if (err.code === 'P2002') {
          throw new ConflictException(
            `Version ${data.version} already exists for this automation`,
          );
        }
        // Automation row missing — FK on create (P2003) or update target gone
        // (P2025). Surface a clean 404 instead of a raw 500.
        if (err.code === 'P2003' || err.code === 'P2025') {
          throw new NotFoundException(`Automation ${automationId} not found`);
        }
      }
      throw err;
    }
  }

  async findRunsByAutomationId(automationId: string) {
    const runs = await db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomationId: automationId,
      },
      include: {
        evidenceAutomation: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return runs;
  }

  async listVersions(automationId: string, limit?: number, offset?: number) {
    const versions = await db.evidenceAutomationVersion.findMany({
      where: {
        evidenceAutomationId: automationId,
      },
      orderBy: {
        version: 'desc',
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    });

    return {
      success: true,
      versions,
    };
  }
}

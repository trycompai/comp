import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
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

    // Update the automation
    const automation = await db.evidenceAutomation.update({
      where: {
        id: automationId,
      },
      data: updateAutomationDto,
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

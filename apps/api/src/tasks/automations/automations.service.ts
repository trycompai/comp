import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@Injectable()
export class AutomationsService {
  async findByTaskId(organizationId: string, taskId: string) {
    const automations = await db.evidenceAutomation.findMany({
      where: {
        taskId: taskId,
        organizationId: organizationId,
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

  async findById(organizationId: string, automationId: string) {
    const automation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
        organizationId: organizationId,
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

  async create(
    organizationId: string,
    createAutomationDto: CreateAutomationDto,
  ) {
    const { taskId } = createAutomationDto;

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
        organizationId: organizationId,
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

  async update(
    organizationId: string,
    automationId: string,
    updateAutomationDto: UpdateAutomationDto,
  ) {
    // Verify automation exists and belongs to organization
    const existingAutomation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
        organizationId: organizationId,
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

  async delete(organizationId: string, automationId: string) {
    // Verify automation exists and belongs to organization
    const existingAutomation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
        organizationId: organizationId,
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
}

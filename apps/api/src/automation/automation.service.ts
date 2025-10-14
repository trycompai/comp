import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

@Injectable()
export class AutomationService {
  async create(createAutomationDto: CreateAutomationDto) {
    const { taskId } = createAutomationDto;

    const task = await db.task.findFirst({
      where: {
        id: taskId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const automation = await db.evidenceAutomation.create({
      data: {
        name: `${task.title} - AI Automation`,
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
    const existingAutomation = await db.evidenceAutomation.findFirst({
      where: {
        id: automationId,
      },
    });

    if (!existingAutomation) {
      throw new NotFoundException('Automation not found');
    }

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
}

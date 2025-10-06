import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateAutomationDto } from './dto/create-automation.dto';

@Injectable()
export class AutomationService {
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
        name: `${task.title} - AI Automation`,
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
}

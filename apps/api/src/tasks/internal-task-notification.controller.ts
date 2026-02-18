import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TaskStatus } from '@db';
import { InternalTokenGuard } from '../auth/internal-token.guard';
import { TaskNotifierService } from './task-notifier.service';

class NotifyStatusChangeDto {
  organizationId: string;
  taskId: string;
  taskTitle: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

@ApiTags('Internal - Tasks')
@Controller({ path: 'internal/tasks', version: '1' })
@UseGuards(InternalTokenGuard)
@ApiHeader({
  name: 'X-Internal-Token',
  description: 'Internal service token (required in production)',
  required: false,
})
export class InternalTaskNotificationController {
  private readonly logger = new Logger(InternalTaskNotificationController.name);

  constructor(private readonly taskNotifierService: TaskNotifierService) {}

  @Post('notify-status-change')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Send task status change notifications (email + in-app) without a user actor (internal)',
  })
  @ApiResponse({ status: 200, description: 'Notifications sent' })
  async notifyStatusChange(@Body() body: NotifyStatusChangeDto) {
    this.logger.log(
      `[notifyStatusChange] Received request for task ${body.taskId} (${body.oldStatus} -> ${body.newStatus})`,
    );

    try {
      await this.taskNotifierService.notifyStatusChange({
        organizationId: body.organizationId,
        taskId: body.taskId,
        taskTitle: body.taskTitle,
        oldStatus: body.oldStatus,
        newStatus: body.newStatus,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `[notifyStatusChange] Failed for task ${body.taskId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      return { success: false };
    }
  }
}

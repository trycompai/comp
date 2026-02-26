import {
  Body,
  Controller,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TaskStatus } from '@db';
import { IsBoolean, IsEnum, IsInt, IsString, Min } from 'class-validator';
import { InternalTokenGuard } from '../auth/internal-token.guard';
import { TaskNotifierService } from './task-notifier.service';

const TaskStatusValues = Object.values(TaskStatus);

class NotifyAutomationFailuresDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Task ID' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  taskTitle: string;

  @ApiProperty({ description: 'Number of failed automations' })
  @IsInt()
  @Min(1)
  failedCount: number;

  @ApiProperty({ description: 'Total number of automations' })
  @IsInt()
  @Min(1)
  totalCount: number;

  @ApiProperty({ description: 'Whether task status was changed to failed' })
  @IsBoolean()
  taskStatusChanged: boolean;
}

class NotifyStatusChangeDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Task ID' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  taskTitle: string;

  @ApiProperty({ description: 'Previous task status', enum: TaskStatusValues })
  @IsEnum(TaskStatusValues)
  oldStatus: TaskStatus;

  @ApiProperty({ description: 'New task status', enum: TaskStatusValues })
  @IsEnum(TaskStatusValues)
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
  @ApiResponse({ status: 500, description: 'Notification delivery failed' })
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

      throw new InternalServerErrorException('Failed to send notifications');
    }
  }

  @Post('notify-automation-failures')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Send automation failure notifications (email + in-app) when one or more automations fail (internal)',
  })
  @ApiResponse({ status: 200, description: 'Notifications sent' })
  @ApiResponse({ status: 500, description: 'Notification delivery failed' })
  async notifyAutomationFailures(@Body() body: NotifyAutomationFailuresDto) {
    this.logger.log(
      `[notifyAutomationFailures] Received request for task ${body.taskId} (${body.failedCount}/${body.totalCount} failed, statusChanged=${body.taskStatusChanged})`,
    );

    try {
      await this.taskNotifierService.notifyAutomationFailures({
        organizationId: body.organizationId,
        taskId: body.taskId,
        taskTitle: body.taskTitle,
        failedCount: body.failedCount,
        totalCount: body.totalCount,
        taskStatusChanged: body.taskStatusChanged,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `[notifyAutomationFailures] Failed for task ${body.taskId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw new InternalServerErrorException('Failed to send notifications');
    }
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  TaskStatus,
  TaskFrequency,
  Departments,
  CommentEntityType,
  AttachmentEntityType,
  db,
} from '@db';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { TasksService } from '../tasks/tasks.service';
import { CommentsService } from '../comments/comments.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import { CreateAdminTaskDto } from './dto/create-admin-task.dto';
import type { AdminRequest } from './platform-admin-auth-context';

interface UpdateTaskBody {
  status?: string;
  department?: string;
  frequency?: string | null;
}

@ApiTags('Admin - Tasks')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminTasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly commentsService: CommentsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  @Get(':orgId/tasks')
  @ApiOperation({ summary: 'List all tasks for an organization (admin)' })
  async list(@Param('orgId') orgId: string) {
    return this.tasksService.getTasks(orgId, {}, { includeRelations: true });
  }

  @Post(':orgId/tasks')
  @ApiOperation({ summary: 'Create a task for an organization (admin)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Param('orgId') orgId: string,
    @Body() createDto: CreateAdminTaskDto,
  ) {
    return this.tasksService.createTask(orgId, {
      title: createDto.title,
      description: createDto.description,
      frequency: createDto.frequency ?? null,
      department: createDto.department ?? null,
    });
  }

  @Get(':orgId/tasks/:taskId/details')
  @ApiOperation({ summary: 'Get task details with comments, attachments, and evidence (admin)' })
  async getDetails(
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
  ) {
    // Validate task belongs to org before querying sub-resources
    const task = await this.tasksService.getTask(orgId, taskId);

    const [comments, attachments, automationRuns, integrationRuns] =
      await Promise.all([
        this.commentsService.getComments(
          orgId,
          taskId,
          CommentEntityType.task,
        ),
        this.attachmentsService.getAttachments(
          orgId,
          taskId,
          AttachmentEntityType.task,
        ),
        this.getAutomationRuns(orgId, taskId),
        this.getIntegrationCheckRuns(orgId, taskId),
      ]);

    return {
      ...task,
      comments,
      attachments,
      automationRuns,
      integrationRuns,
    };
  }

  private async getAutomationRuns(orgId: string, taskId: string) {
    return db.evidenceAutomationRun.findMany({
      where: {
        taskId,
        task: { organizationId: orgId },
      },
      include: {
        evidenceAutomation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private async getIntegrationCheckRuns(orgId: string, taskId: string) {
    return db.integrationCheckRun.findMany({
      where: {
        taskId,
        task: { organizationId: orgId },
      },
      include: {
        results: true,
        connection: {
          include: { provider: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Patch(':orgId/tasks/:taskId')
  @ApiOperation({ summary: 'Update a task for an organization (admin)' })
  async update(
    @Param('orgId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskBody,
    @Req() req: AdminRequest,
  ) {
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!Object.values(TaskStatus).includes(body.status as TaskStatus)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(TaskStatus).join(', ')}`,
        );
      }
      updateData.status = body.status as TaskStatus;
    }

    if (body.department !== undefined) {
      if (
        !Object.values(Departments).includes(body.department as Departments)
      ) {
        throw new BadRequestException(
          `Invalid department. Must be one of: ${Object.values(Departments).join(', ')}`,
        );
      }
      updateData.department = body.department;
    }

    if (body.frequency !== undefined) {
      if (
        body.frequency !== null &&
        !Object.values(TaskFrequency).includes(
          body.frequency as TaskFrequency,
        )
      ) {
        throw new BadRequestException(
          `Invalid frequency. Must be one of: ${Object.values(TaskFrequency).join(', ')}`,
        );
      }
      updateData.frequency = body.frequency as TaskFrequency;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field (status, department, frequency) is required',
      );
    }

    return this.tasksService.updateTask(orgId, taskId, updateData, req.userId);
  }
}

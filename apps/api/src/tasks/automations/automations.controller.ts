import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { TasksService } from '../tasks.service';
import { AutomationsService } from './automations.service';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { AUTOMATION_OPERATIONS } from './schemas/automation-operations';
import { CREATE_AUTOMATION_RESPONSES } from './schemas/create-automation.responses';
import { UPDATE_AUTOMATION_RESPONSES } from './schemas/update-automation.responses';

@ApiTags('Task Automations')
@Controller({ path: 'tasks/:taskId/automations', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class AutomationsController {
  constructor(
    private readonly automationsService: AutomationsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all automations for a task',
    description: 'Retrieve all automations for a specific task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Automations retrieved successfully',
  })
  async getTaskAutomations(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    // Verify task access first
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return this.automationsService.findByTaskId(taskId);
  }

  @Get(':automationId')
  @ApiOperation({
    summary: 'Get automation details',
    description: 'Retrieve details for a specific automation',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiParam({
    name: 'automationId',
    description: 'Unique automation identifier',
    example: 'auto_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Automation details retrieved successfully',
  })
  async getAutomation(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('automationId') automationId: string,
  ) {
    // Verify task access first
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return this.automationsService.findById(automationId);
  }

  @Post()
  @ApiOperation(AUTOMATION_OPERATIONS.createAutomation)
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[201])
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[400])
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[401])
  @ApiResponse(CREATE_AUTOMATION_RESPONSES[404])
  async createAutomation(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    // Verify task access first
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return this.automationsService.create(organizationId, taskId);
  }

  @Patch(':automationId')
  @ApiOperation(AUTOMATION_OPERATIONS.updateAutomation)
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiParam({
    name: 'automationId',
    description: 'Unique automation identifier',
    example: 'auto_abc123def456',
  })
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[200])
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[400])
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[401])
  @ApiResponse(UPDATE_AUTOMATION_RESPONSES[404])
  async updateAutomation(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('automationId') automationId: string,
    @Body() updateAutomationDto: UpdateAutomationDto,
  ) {
    // Verify task access first
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return this.automationsService.update(automationId, updateAutomationDto);
  }

  @Delete(':automationId')
  @ApiOperation({
    summary: 'Delete an automation',
    description: 'Delete a specific automation and all its associated data',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiParam({
    name: 'automationId',
    description: 'Unique automation identifier',
    example: 'auto_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Automation deleted successfully',
  })
  async deleteAutomation(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('automationId') automationId: string,
  ) {
    // Verify task access first
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    return this.automationsService.delete(automationId);
  }

  @Get(':automationId/versions')
  @ApiOperation({
    summary: 'Get all versions for an automation',
    description: 'Retrieve all published versions of an automation script',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
  })
  @ApiParam({
    name: 'automationId',
    description: 'Automation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Versions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        versions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              version: { type: 'number' },
              scriptKey: { type: 'string' },
              changelog: { type: 'string', nullable: true },
              publishedBy: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getAutomationVersions(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('automationId') automationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    await this.tasksService.verifyTaskAccess(organizationId, taskId);
    const parsedLimit = limit ? parseInt(limit) : undefined;
    const parsedOffset = offset ? parseInt(offset) : undefined;
    return this.automationsService.listVersions(
      automationId,
      parsedLimit,
      parsedOffset,
    );
  }

  // ==================== AUTOMATION RUNS (per task) ====================

  @Get('runs')
  @ApiOperation({
    summary: 'Get all automation runs for a task',
    description:
      'Retrieve all evidence automation runs across automations for a specific task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Task ID',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Automation runs retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'ear_abc123def456' },
              status: {
                type: 'string',
                enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
              },
              trigger: {
                type: 'string',
                enum: ['MANUAL', 'SCHEDULED', 'EVENT'],
              },
              createdAt: { type: 'string', format: 'date-time' },
              completedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              error: { type: 'object', nullable: true },
            },
          },
        },
      },
    },
  })
  async getTaskAutomationRuns(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    // Verify task access first
    await this.tasksService.verifyTaskAccess(organizationId, taskId);
    return await this.tasksService.getTaskAutomationRuns(
      organizationId,
      taskId,
    );
  }
}

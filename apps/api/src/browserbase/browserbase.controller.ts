import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { BrowserbaseService } from './browserbase.service';
import {
  AuthStatusResponseDto,
  BrowserAutomationResponseDto,
  BrowserAutomationRunResponseDto,
  CheckAuthDto,
  CloseSessionDto,
  ContextResponseDto,
  CreateBrowserAutomationDto,
  CreateSessionDto,
  NavigateToUrlDto,
  RunAutomationResponseDto,
  SessionResponseDto,
  UpdateBrowserAutomationDto,
} from './dto/browserbase.dto';

@ApiTags('Browserbase')
@Controller({ path: 'browserbase', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description: 'Organization ID (required for session auth)',
  required: true,
})
export class BrowserbaseController {
  constructor(private readonly browserbaseService: BrowserbaseService) {}

  // ===== Organization Context =====

  @Post('org-context')
  @ApiOperation({
    summary: 'Get or create organization browser context',
    description:
      'Gets the existing browser context for the org or creates a new one',
  })
  @ApiResponse({
    status: 201,
    description: 'Context retrieved or created',
    type: ContextResponseDto,
  })
  async getOrCreateOrgContext(
    @OrganizationId() organizationId: string,
  ): Promise<ContextResponseDto> {
    return await this.browserbaseService.getOrCreateOrgContext(organizationId);
  }

  @Get('org-context')
  @ApiOperation({
    summary: 'Get organization browser context status',
    description: 'Gets the current browser context for the org if it exists',
  })
  @ApiResponse({
    status: 200,
    description: 'Context status',
  })
  async getOrgContextStatus(
    @OrganizationId() organizationId: string,
  ): Promise<{ hasContext: boolean; contextId?: string }> {
    const context = await this.browserbaseService.getOrgContext(organizationId);
    return {
      hasContext: !!context,
      contextId: context?.contextId,
    };
  }

  // ===== Session Management =====

  @Post('session')
  @ApiOperation({
    summary: 'Create a new browser session',
    description: 'Creates a new browser session using the org context',
  })
  @ApiResponse({
    status: 201,
    description: 'Session created',
    type: SessionResponseDto,
  })
  async createSession(
    @Body() dto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    return await this.browserbaseService.createSessionWithContext(
      dto.contextId,
    );
  }

  @Post('session/close')
  @ApiOperation({
    summary: 'Close a browser session',
  })
  @ApiResponse({
    status: 200,
    description: 'Session closed',
  })
  async closeSession(
    @Body() dto: CloseSessionDto,
  ): Promise<{ success: boolean }> {
    await this.browserbaseService.closeSession(dto.sessionId);
    return { success: true };
  }

  // ===== Browser Navigation =====

  @Post('navigate')
  @ApiOperation({
    summary: 'Navigate to a URL',
    description: 'Navigates the browser session to the specified URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation result',
  })
  async navigateToUrl(
    @Body() dto: NavigateToUrlDto,
  ): Promise<{ success: boolean; error?: string }> {
    return await this.browserbaseService.navigateToUrl(dto.sessionId, dto.url);
  }

  @Post('check-auth')
  @ApiOperation({
    summary: 'Check authentication status',
    description: 'Checks if the user is logged in on the specified site',
  })
  @ApiResponse({
    status: 200,
    description: 'Auth status',
    type: AuthStatusResponseDto,
  })
  async checkAuth(@Body() dto: CheckAuthDto): Promise<AuthStatusResponseDto> {
    return await this.browserbaseService.checkLoginStatus(
      dto.sessionId,
      dto.url,
    );
  }

  // ===== Browser Automations CRUD =====

  @Post('automations')
  @ApiOperation({
    summary: 'Create a browser automation',
  })
  @ApiResponse({
    status: 201,
    description: 'Automation created',
    type: BrowserAutomationResponseDto,
  })
  async createAutomation(
    @Body() dto: CreateBrowserAutomationDto,
  ): Promise<BrowserAutomationResponseDto> {
    return (await this.browserbaseService.createBrowserAutomation(
      dto,
    )) as BrowserAutomationResponseDto;
  }

  @Get('automations/task/:taskId')
  @ApiOperation({
    summary: 'Get all browser automations for a task',
  })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'List of automations',
    type: [BrowserAutomationResponseDto],
  })
  async getAutomationsForTask(
    @Param('taskId') taskId: string,
  ): Promise<BrowserAutomationResponseDto[]> {
    return (await this.browserbaseService.getAutomationsWithPresignedUrls(
      taskId,
    )) as BrowserAutomationResponseDto[];
  }

  @Get('automations/:automationId')
  @ApiOperation({
    summary: 'Get a browser automation by ID',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'Automation details',
    type: BrowserAutomationResponseDto,
  })
  async getAutomation(
    @Param('automationId') automationId: string,
  ): Promise<BrowserAutomationResponseDto | null> {
    return (await this.browserbaseService.getBrowserAutomation(
      automationId,
    )) as BrowserAutomationResponseDto | null;
  }

  @Patch('automations/:automationId')
  @ApiOperation({
    summary: 'Update a browser automation',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'Automation updated',
    type: BrowserAutomationResponseDto,
  })
  async updateAutomation(
    @Param('automationId') automationId: string,
    @Body() dto: UpdateBrowserAutomationDto,
  ): Promise<BrowserAutomationResponseDto> {
    return (await this.browserbaseService.updateBrowserAutomation(
      automationId,
      dto,
    )) as BrowserAutomationResponseDto;
  }

  @Delete('automations/:automationId')
  @ApiOperation({
    summary: 'Delete a browser automation',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'Automation deleted',
  })
  async deleteAutomation(
    @Param('automationId') automationId: string,
  ): Promise<{ success: boolean }> {
    await this.browserbaseService.deleteBrowserAutomation(automationId);
    return { success: true };
  }

  // ===== Automation Execution =====

  @Post('automations/:automationId/start-live')
  @ApiOperation({
    summary: 'Start automation with live view',
    description:
      'Creates a session and returns live view URL for watching execution',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'Session started with live view URL',
  })
  async startAutomationLive(
    @Param('automationId') automationId: string,
    @OrganizationId() organizationId: string,
  ): Promise<{
    runId: string;
    sessionId: string;
    liveViewUrl: string;
    error?: string;
    needsReauth?: boolean;
  }> {
    return await this.browserbaseService.startAutomationWithLiveView(
      automationId,
      organizationId,
    );
  }

  @Post('automations/:automationId/execute')
  @ApiOperation({
    summary: 'Execute automation on existing session',
    description: 'Runs the automation on a pre-created session',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution result',
  })
  async executeAutomationOnSession(
    @Param('automationId') automationId: string,
    @Body() body: { runId: string; sessionId: string },
    @OrganizationId() organizationId: string,
  ): Promise<{
    success: boolean;
    screenshotUrl?: string;
    error?: string;
    needsReauth?: boolean;
  }> {
    return await this.browserbaseService.executeAutomationOnSession(
      automationId,
      body.runId,
      body.sessionId,
      organizationId,
    );
  }

  @Post('automations/:automationId/run')
  @ApiOperation({
    summary: 'Run a browser automation',
    description: 'Executes the automation and returns the result',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'Run result',
    type: RunAutomationResponseDto,
  })
  async runAutomation(
    @Param('automationId') automationId: string,
    @OrganizationId() organizationId: string,
  ): Promise<RunAutomationResponseDto> {
    return await this.browserbaseService.runBrowserAutomation(
      automationId,
      organizationId,
    );
  }

  // ===== Run History =====

  @Get('automations/:automationId/runs')
  @ApiOperation({
    summary: 'Get run history for an automation',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiResponse({
    status: 200,
    description: 'List of runs',
    type: [BrowserAutomationRunResponseDto],
  })
  async getAutomationRuns(
    @Param('automationId') automationId: string,
  ): Promise<BrowserAutomationRunResponseDto[]> {
    return (await this.browserbaseService.getAutomationRuns(
      automationId,
    )) as BrowserAutomationRunResponseDto[];
  }

  @Get('runs/:runId')
  @ApiOperation({
    summary: 'Get a specific run by ID',
  })
  @ApiParam({ name: 'runId', description: 'Run ID' })
  @ApiResponse({
    status: 200,
    description: 'Run details',
    type: BrowserAutomationRunResponseDto,
  })
  async getRunById(
    @Param('runId') runId: string,
  ): Promise<BrowserAutomationRunResponseDto | null> {
    return (await this.browserbaseService.getRunWithPresignedUrl(
      runId,
    )) as BrowserAutomationRunResponseDto | null;
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { BrowserbaseService } from './browserbase.service';
import {
  AnalyzeLoginDto,
  AnalyzeLoginResponseDto,
  AuthStatusResponseDto,
  BrowserAutomationResponseDto,
  BrowserAutomationRunResponseDto,
  CheckAuthDto,
  CloseSessionDto,
  ContextResponseDto,
  CreateBrowserAutomationDraftDto,
  CreateBrowserAutomationDto,
  CreateSessionDto,
  ExecuteAutomationSessionDto,
  NavigateToUrlDto,
  RunAutomationResponseDto,
  SessionResponseDto,
  SetTaskScheduleDto,
  TestInstructionDto,
  TestInstructionResponseDto,
  UpdateBrowserAutomationDraftDto,
  UpdateBrowserAutomationDto,
} from './dto/browserbase.dto';
import { TaskFrequency } from '@db';

@ApiTags('Browserbase')
@Controller({ path: 'browserbase', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class BrowserbaseController {
  constructor(private readonly browserbaseService: BrowserbaseService) {}

  // ===== Login Analysis =====

  @Post('analyze-login')
  @RequirePermission('integration', 'create')
  @ApiOperation({
    summary: 'Analyze a vendor sign-in page',
    description:
      'Opens the vendor sign-in page in a throwaway cloud browser and detects which login methods it supports, so the connect flow can recommend the most reliable setup. Reads a public page only — no credentials. Always degrades to a manual fallback.',
  })
  @ApiBody({ type: AnalyzeLoginDto })
  @ApiResponse({ status: 201, type: AnalyzeLoginResponseDto })
  async analyzeLogin(
    @Body() dto: AnalyzeLoginDto,
  ): Promise<AnalyzeLoginResponseDto> {
    return this.browserbaseService.analyzeLogin(dto.url);
  }

  // ===== Organization Context =====

  @Post('org-context')
  @RequirePermission('integration', 'create')
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
  @RequirePermission('integration', 'read')
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
  @RequirePermission('integration', 'read')
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
  @RequirePermission('integration', 'read')
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
  @RequirePermission('integration', 'read')
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
  @RequirePermission('integration', 'read')
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
  @RequirePermission('task', 'create')
  @ApiOperation({
    summary: 'Create a browser automation',
  })
  @ApiResponse({
    status: 201,
    description: 'Automation created',
    type: BrowserAutomationResponseDto,
  })
  async createAutomation(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateBrowserAutomationDto,
  ): Promise<BrowserAutomationResponseDto> {
    return (await this.browserbaseService.createBrowserAutomation(
      dto,
      organizationId,
    )) as BrowserAutomationResponseDto;
  }

  @Post('automations/test')
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Test an instruction before saving',
    description:
      'Runs a not-yet-saved instruction against the connection’s live session so the user can watch it work before committing it to the schedule. Nothing is persisted. Returns a run handle to subscribe to for live steps and the final result.',
  })
  @ApiBody({ type: TestInstructionDto })
  @ApiResponse({ status: 201, type: TestInstructionResponseDto })
  async testInstruction(
    @OrganizationId() organizationId: string,
    @Body() dto: TestInstructionDto,
  ): Promise<TestInstructionResponseDto> {
    return this.browserbaseService.testInstruction({
      organizationId,
      taskId: dto.taskId,
      profileId: dto.profileId,
      targetUrl: dto.targetUrl,
      instruction: dto.instruction,
      evaluationCriteria: dto.evaluationCriteria,
    });
  }

  @Get('automations/task/:taskId')
  @RequirePermission('task', 'read')
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
    @OrganizationId() organizationId: string,
  ): Promise<BrowserAutomationResponseDto[]> {
    return (await this.browserbaseService.getAutomationsWithPresignedUrls(
      taskId,
      organizationId,
    )) as BrowserAutomationResponseDto[];
  }

  @Get('automations/:automationId')
  @RequirePermission('task', 'read')
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
    @OrganizationId() organizationId: string,
  ): Promise<BrowserAutomationResponseDto | null> {
    return (await this.browserbaseService.getBrowserAutomation(
      automationId,
      organizationId,
    )) as BrowserAutomationResponseDto | null;
  }

  @Patch('automations/:automationId')
  @RequirePermission('task', 'update')
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
    @OrganizationId() organizationId: string,
    @Body() dto: UpdateBrowserAutomationDto,
  ): Promise<BrowserAutomationResponseDto> {
    return (await this.browserbaseService.updateBrowserAutomation(
      automationId,
      dto,
      organizationId,
    )) as BrowserAutomationResponseDto;
  }

  @Patch('automations/task/:taskId/schedule')
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Set the schedule for every browser automation on a task',
  })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task schedule updated' })
  async setTaskSchedule(
    @Param('taskId') taskId: string,
    @OrganizationId() organizationId: string,
    @Body() dto: SetTaskScheduleDto,
  ): Promise<{ success: boolean; scheduleFrequency: TaskFrequency }> {
    const result = await this.browserbaseService.setTaskSchedule(
      taskId,
      dto.scheduleFrequency,
      organizationId,
    );
    return { success: true, scheduleFrequency: result.scheduleFrequency };
  }

  @Delete('automations/:automationId')
  @RequirePermission('task', 'delete')
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
    @OrganizationId() organizationId: string,
  ): Promise<{ success: boolean }> {
    await this.browserbaseService.deleteBrowserAutomation(
      automationId,
      organizationId,
    );
    return { success: true };
  }

  // ===== Automation Drafts (in-progress, unsaved) =====

  @Get('automations/task/:taskId/drafts')
  @RequirePermission('task', 'read')
  @ApiOperation({ summary: 'List in-progress automation drafts for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async listDrafts(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.browserbaseService.listAutomationDrafts(taskId, organizationId);
  }

  @Post('automation-drafts')
  @RequirePermission('task', 'create')
  @ApiOperation({ summary: 'Create an in-progress automation draft' })
  @ApiBody({ type: CreateBrowserAutomationDraftDto })
  async createDraft(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateBrowserAutomationDraftDto,
  ) {
    return this.browserbaseService.createAutomationDraft(dto, organizationId);
  }

  @Patch('automation-drafts/:draftId')
  @RequirePermission('task', 'update')
  @ApiOperation({ summary: 'Autosave an in-progress automation draft' })
  @ApiParam({ name: 'draftId', description: 'Draft ID' })
  @ApiBody({ type: UpdateBrowserAutomationDraftDto })
  async updateDraft(
    @OrganizationId() organizationId: string,
    @Param('draftId') draftId: string,
    @Body() dto: UpdateBrowserAutomationDraftDto,
  ) {
    return this.browserbaseService.updateAutomationDraft(draftId, dto, organizationId);
  }

  @Delete('automation-drafts/:draftId')
  @RequirePermission('task', 'delete')
  @ApiOperation({ summary: 'Discard an in-progress automation draft' })
  @ApiParam({ name: 'draftId', description: 'Draft ID' })
  async deleteDraft(
    @OrganizationId() organizationId: string,
    @Param('draftId') draftId: string,
  ): Promise<{ success: boolean }> {
    await this.browserbaseService.deleteAutomationDraft(draftId, organizationId);
    return { success: true };
  }

  // ===== Automation Execution =====

  @Post('automations/:automationId/start-live')
  @RequirePermission('task', 'update')
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
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Execute automation on existing session',
    description: 'Runs the automation on a pre-created session',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiBody({ type: ExecuteAutomationSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Execution result',
  })
  async executeAutomationOnSession(
    @Param('automationId') automationId: string,
    @Body() body: ExecuteAutomationSessionDto,
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

  @Post('automations/:automationId/execute-live')
  @RequirePermission('task', 'update')
  @ApiOperation({
    summary: 'Execute automation on a session with live step streaming',
    description:
      'Runs the automation on a pre-created session as a background task so the ' +
      'live view can stream the AI’s steps. Returns a run handle to subscribe to.',
  })
  @ApiParam({ name: 'automationId', description: 'Automation ID' })
  @ApiBody({ type: ExecuteAutomationSessionDto })
  @ApiResponse({ status: 200, description: 'Run handle for realtime steps' })
  async executeAutomationLive(
    @Param('automationId') automationId: string,
    @Body() body: ExecuteAutomationSessionDto,
    @OrganizationId() organizationId: string,
  ): Promise<{ runId: string; publicAccessToken: string }> {
    return await this.browserbaseService.startLiveAutomationExecution({
      automationId,
      runId: body.runId,
      sessionId: body.sessionId,
      organizationId,
    });
  }

  @Post('automations/:automationId/run')
  @RequirePermission('task', 'update')
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
  @RequirePermission('task', 'read')
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
    @OrganizationId() organizationId: string,
  ): Promise<BrowserAutomationRunResponseDto[]> {
    return (await this.browserbaseService.getAutomationRuns(
      automationId,
      20,
      organizationId,
    )) as BrowserAutomationRunResponseDto[];
  }

  @Get('runs/:runId')
  @RequirePermission('task', 'read')
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
    @OrganizationId() organizationId: string,
  ): Promise<BrowserAutomationRunResponseDto | null> {
    return (await this.browserbaseService.getRunWithPresignedUrl(
      runId,
      organizationId,
    )) as BrowserAutomationRunResponseDto | null;
  }

  @Get('runs/:runId/screenshot')
  @RequirePermission('task', 'read')
  @ApiOperation({
    summary: 'Redirect to a freshly signed screenshot URL',
    description:
      'Issues a 302 redirect to a newly signed S3 URL so that "Open full size" links never serve an expired URL. Pass ?download=true to force an attachment download.',
  })
  @ApiParam({ name: 'runId', description: 'Run ID' })
  @ApiResponse({ status: 302, description: 'Redirect to signed S3 URL' })
  @ApiResponse({ status: 404, description: 'Run or screenshot not found' })
  async redirectToScreenshot(
    @Param('runId') runId: string,
    @OrganizationId() organizationId: string,
    @Res() res: Response,
    @Query('download') download?: string,
  ): Promise<void> {
    const url = await this.browserbaseService.getScreenshotRedirectUrl({
      runId,
      organizationId,
      download: download === 'true' || download === '1',
    });
    res.redirect(302, url);
  }
}

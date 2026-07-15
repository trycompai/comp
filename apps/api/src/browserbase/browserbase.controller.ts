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
  AuthStatusResponseDto,
  BrowserAutomationResponseDto,
  BrowserAutomationRunResponseDto,
  CheckAuthDto,
  LoginAnalysisResponseDto,
  CloseSessionDto,
  ContextResponseDto,
  CreateBrowserAutomationDto,
  CreateSessionDto,
  ExecuteAutomationSessionDto,
  NavigateToUrlDto,
  RunAutomationResponseDto,
  SessionResponseDto,
  UpdateBrowserAutomationDto,
} from './dto/browserbase.dto';

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
  @ApiResponse({ status: 201, type: LoginAnalysisResponseDto })
  async analyzeLogin(
    @Body() dto: AnalyzeLoginDto,
  ): Promise<LoginAnalysisResponseDto> {
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

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { VendorIntegrationsService } from './vendor-integrations.service';

interface ConnectIntegrationDto {
  connectionId: string;
}

interface DisconnectIntegrationDto {
  connectionId: string;
}

interface UpdateCheckDto {
  connectionId: string;
  enabled: boolean;
  disabledReason?: string;
}

interface RunChecksDto {
  connectionId?: string;
  checkId?: string;
}

@ApiTags('Vendor Integrations')
@Controller({ path: 'vendors/:vendorId/integrations', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class VendorIntegrationsController {
  constructor(
    private readonly vendorIntegrationsService: VendorIntegrationsService,
  ) {}

  @Get()
  @RequirePermission('vendor', 'read')
  @ApiOperation({ summary: 'List connected and available integrations for vendor' })
  async listIntegrations(
    @Param('vendorId') vendorId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.vendorIntegrationsService.getVendorIntegrations(
      vendorId,
      organizationId,
    );

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Post('connect')
  @RequirePermission('vendor', 'update')
  @ApiOperation({ summary: 'Link a connection to this vendor' })
  async connectIntegration(
    @Param('vendorId') vendorId: string,
    @Body() body: ConnectIntegrationDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const connection = await this.vendorIntegrationsService.connectIntegration(
      vendorId,
      organizationId,
      body.connectionId,
    );

    return {
      ...connection,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Post('disconnect')
  @RequirePermission('vendor', 'update')
  @ApiOperation({ summary: 'Unlink a connection from this vendor' })
  async disconnectIntegration(
    @Param('vendorId') vendorId: string,
    @Body() body: DisconnectIntegrationDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    await this.vendorIntegrationsService.disconnectIntegration(
      vendorId,
      organizationId,
      body.connectionId,
    );

    return {
      success: true,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Patch('checks/:checkId')
  @RequirePermission('vendor', 'update')
  @ApiOperation({ summary: 'Enable or disable a check for this vendor' })
  async updateCheck(
    @Param('vendorId') vendorId: string,
    @Param('checkId') checkId: string,
    @Body() body: UpdateCheckDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const config = await this.vendorIntegrationsService.updateCheckConfig(
      vendorId,
      organizationId,
      body.connectionId,
      checkId,
      {
        enabled: body.enabled,
        disabledReason: body.disabledReason,
      },
    );

    return {
      ...config,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Post('checks/run')
  @RequirePermission('vendor', 'update')
  @ApiOperation({ summary: 'Run all enabled checks for this vendor' })
  async runChecks(
    @Param('vendorId') vendorId: string,
    @Body() body: RunChecksDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.vendorIntegrationsService.runVendorChecks(
      vendorId,
      organizationId,
    );

    return {
      ...result,
      success: true,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get('checks/:checkId/detail')
  @RequirePermission('vendor', 'read')
  @ApiOperation({ summary: 'Get latest results for a specific check' })
  async getCheckDetail(
    @Param('vendorId') vendorId: string,
    @Param('checkId') checkId: string,
    @Query('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    return this.vendorIntegrationsService.getCheckDetail(
      vendorId,
      organizationId,
      connectionId,
      checkId,
    );
  }

  @Post('checks/:checkId/remediation')
  @RequirePermission('vendor', 'read')
  @ApiOperation({ summary: 'Stream AI remediation for a failed check' })
  async getCheckRemediation(
    @Param('vendorId') vendorId: string,
    @Param('checkId') checkId: string,
    @Body() body: { connectionId: string },
    @OrganizationId() organizationId: string,
    @Res() res: import('express').Response,
  ) {
    const promptData = await this.vendorIntegrationsService.buildRemediationPrompt(
      vendorId,
      organizationId,
      body.connectionId,
      checkId,
    );

    if (!promptData) {
      res.json({ remediation: 'All checks are passing.' });
      return;
    }

    const { streamText } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');

    const result = streamText({
      model: openai('gpt-5.4'),
      system: 'You are a compliance remediation assistant. Respond in exactly 2-3 short sentences as plain prose. Name the specific resources that need fixing and the exact steps. Do not use bullet points, numbered lists, or headings. Bold the resource names and action verbs. Keep it under 50 words.',
      prompt: promptData.prompt,
    });

    result.pipeTextStreamToResponse(res);
  }

  @Get('checks/results')
  @RequirePermission('vendor', 'read')
  @ApiOperation({ summary: 'Get check results for this vendor' })
  async getCheckResults(
    @Param('vendorId') vendorId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const results = await this.vendorIntegrationsService.getCheckResults(
      vendorId,
      organizationId,
    );

    return {
      data: results,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get('checks/history')
  @RequirePermission('vendor', 'read')
  @ApiOperation({ summary: 'Get check run history for this vendor' })
  async getCheckHistory(
    @Param('vendorId') vendorId: string,
    @Query('days') days: string | undefined,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const history = await this.vendorIntegrationsService.getCheckHistory(
      vendorId,
      organizationId,
      days ? parseInt(days, 10) : undefined,
    );

    return {
      data: history,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }

  @Get('checks/summary')
  @RequirePermission('vendor', 'read')
  @ApiOperation({ summary: 'Get compact pass/fail summary for this vendor' })
  async getCheckSummary(
    @Param('vendorId') vendorId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const summary = await this.vendorIntegrationsService.getChecksSummary(
      vendorId,
      organizationId,
    );

    return {
      ...summary,
      authType: authContext.authType,
      ...(authContext.userId &&
        authContext.userEmail && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
    };
  }
}

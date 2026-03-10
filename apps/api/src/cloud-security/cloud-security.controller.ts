import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import {
  CloudSecurityService,
  ConnectionNotFoundError,
} from './cloud-security.service';
import { CloudSecurityQueryService } from './cloud-security-query.service';
import { CloudSecurityLegacyService } from './cloud-security-legacy.service';

@Controller({ path: 'cloud-security', version: '1' })
export class CloudSecurityController {
  private readonly logger = new Logger(CloudSecurityController.name);

  constructor(
    private readonly cloudSecurityService: CloudSecurityService,
    private readonly queryService: CloudSecurityQueryService,
    private readonly legacyService: CloudSecurityLegacyService,
  ) {}

  @Get('providers')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getProviders(@OrganizationId() organizationId: string) {
    const providers = await this.queryService.getProviders(organizationId);
    return { data: providers, count: providers.length };
  }

  @Get('findings')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getFindings(@OrganizationId() organizationId: string) {
    const findings = await this.queryService.getFindings(organizationId);
    return { data: findings, count: findings.length };
  }

  @Post('scan/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async scan(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {

    this.logger.log(
      `Cloud security scan requested for connection ${connectionId}`,
    );

    const result = await this.cloudSecurityService.scan(
      connectionId,
      organizationId,
    );

    if (!result.success) {
      throw new HttpException(
        {
          message: result.error || 'Scan failed',
          provider: result.provider,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      provider: result.provider,
      findingsCount: result.findings.length,
      scannedAt: result.scannedAt,
    };
  }

  @Post('trigger/:connectionId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'update')
  async triggerScan(
    @Param('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    this.logger.log(
      `Cloud security scan trigger requested for connection ${connectionId}`,
    );

    try {
      const result = await this.cloudSecurityService.triggerScan(
        connectionId,
        organizationId,
      );
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to trigger scan';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('runs/:runId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async getRunStatus(
    @Param('runId') runId: string,
    @Query('connectionId') connectionId: string,
    @OrganizationId() organizationId: string,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId query parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.cloudSecurityService.getRunStatus(
        runId,
        connectionId,
        organizationId,
      );
    } catch (error) {
      if (error instanceof ConnectionNotFoundError) {
        throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
      }
      const message =
        error instanceof Error ? error.message : 'Failed to get run status';
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('legacy/connect')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'create')
  async connectLegacy(
    @OrganizationId() organizationId: string,
    @Body() body: { provider: 'aws' | 'gcp' | 'azure'; credentials: Record<string, string | string[]> },
  ) {
    const result = await this.legacyService.connectLegacy(
      organizationId,
      body.provider,
      body.credentials,
    );
    return { success: true, integrationId: result.integrationId };
  }

  @Post('legacy/validate-aws')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'read')
  async validateAwsCredentials(
    @Body() body: { accessKeyId: string; secretAccessKey: string },
  ) {
    const result = await this.legacyService.validateAwsAccessKeys(
      body.accessKeyId,
      body.secretAccessKey,
    );
    return { success: true, accountId: result.accountId, regions: result.regions };
  }

  @Delete('legacy/:integrationId')
  @UseGuards(HybridAuthGuard, PermissionGuard)
  @RequirePermission('integration', 'delete')
  async disconnectLegacy(
    @Param('integrationId') integrationId: string,
    @OrganizationId() organizationId: string,
  ) {
    await this.legacyService.disconnectLegacy(integrationId, organizationId);
    return { success: true };
  }
}

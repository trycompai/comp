import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CloudSecurityService } from './cloud-security.service';
import { CloudSecurityQueryService } from './cloud-security-query.service';
import { CloudSecurityLegacyService } from './cloud-security-legacy.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';

@Controller({ path: 'cloud-security', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiTags('Cloud Security')
@ApiSecurity('apikey')
export class CloudSecurityController {
  private readonly logger = new Logger(CloudSecurityController.name);

  constructor(
    private readonly cloudSecurityService: CloudSecurityService,
    private readonly queryService: CloudSecurityQueryService,
    private readonly legacyService: CloudSecurityLegacyService,
  ) {}

  // ============================================================
  // Read endpoints
  // ============================================================

  @Get('providers')
  @RequirePermission('cloud-security', 'read')
  async getProviders(@OrganizationId() organizationId: string) {
    const data = await this.queryService.getProviders(organizationId);
    return { data, count: data.length };
  }

  @Get('findings')
  @RequirePermission('cloud-security', 'read')
  async getFindings(@OrganizationId() organizationId: string) {
    const data = await this.queryService.getFindings(organizationId);
    return { data, count: data.length };
  }

  // ============================================================
  // Scan endpoint (existing)
  // ============================================================

  @Post('scan/:connectionId')
  @RequirePermission('cloud-security', 'update')
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

  // ============================================================
  // Legacy integration endpoints
  // ============================================================

  @Post('legacy/connect')
  @RequirePermission('cloud-security', 'create')
  async connectLegacy(
    @OrganizationId() organizationId: string,
    @Body()
    body: {
      provider: 'aws' | 'gcp' | 'azure';
      credentials: Record<string, string | string[]>;
    },
  ) {
    if (!['aws', 'gcp', 'azure'].includes(body.provider)) {
      throw new HttpException('Invalid provider', HttpStatus.BAD_REQUEST);
    }

    const result = await this.legacyService.connectLegacy(
      organizationId,
      body.provider,
      body.credentials,
    );

    return { success: true, integrationId: result.integrationId };
  }

  @Delete('legacy/:id')
  @RequirePermission('cloud-security', 'delete')
  async disconnectLegacy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    await this.legacyService.disconnectLegacy(id, organizationId);
    return { success: true };
  }

  @Post('legacy/validate-aws')
  @RequirePermission('cloud-security', 'read')
  async validateAwsCredentials(
    @Body() body: { accessKeyId: string; secretAccessKey: string },
  ) {
    const result = await this.legacyService.validateAwsAccessKeys(
      body.accessKeyId,
      body.secretAccessKey,
    );

    return {
      success: true,
      accountId: result.accountId,
      regions: result.regions,
    };
  }
}

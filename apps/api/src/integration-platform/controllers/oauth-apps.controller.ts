import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { OAuthAppRepository } from '../repositories/oauth-app.repository';
import { getManifest } from '@comp/integration-platform';

interface SaveOAuthAppDto {
  providerSlug: string;
  clientId: string;
  clientSecret: string;
  customScopes?: string[];
}

@Controller({ path: 'integrations/oauth-apps', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class OAuthAppsController {
  private readonly logger = new Logger(OAuthAppsController.name);

  constructor(
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly oauthAppRepository: OAuthAppRepository,
  ) {}

  /**
   * List custom OAuth apps for an organization
   */
  @Get()
  @RequirePermission('integration', 'read')
  async listOAuthApps(@OrganizationId() organizationId: string) {
    const apps =
      await this.oauthAppRepository.findByOrganization(organizationId);

    // Don't expose encrypted credentials, just metadata
    return apps.map((app) => ({
      providerSlug: app.providerSlug,
      customScopes: app.customScopes,
      isActive: app.isActive,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));
  }

  /**
   * Get OAuth app setup info for a provider
   */
  @Get('setup/:providerSlug')
  @RequirePermission('integration', 'read')
  async getSetupInfo(
    @Param('providerSlug') providerSlug: string,
    @OrganizationId() organizationId: string,
  ) {
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (manifest.auth.type !== 'oauth2') {
      throw new HttpException(
        `Provider ${providerSlug} does not use OAuth`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const oauthConfig = manifest.auth.config;
    const availability = await this.oauthCredentialsService.checkAvailability(
      providerSlug,
      organizationId,
    );

    // Build callback URL that user needs to configure in their OAuth app
    const callbackUrl = `${process.env.BASE_URL || 'http://localhost:3333'}/v1/integrations/oauth/callback`;

    return {
      providerSlug,
      providerName: manifest.name,
      ...availability,
      requiredScopes: oauthConfig.scopes,
      callbackUrl,
      setupInstructions: oauthConfig.setupInstructions,
      createAppUrl: oauthConfig.createAppUrl,
    };
  }

  /**
   * Save custom OAuth app credentials for an organization
   */
  @Post()
  @RequirePermission('integration', 'create')
  async saveOAuthApp(
    @OrganizationId() organizationId: string,
    @Body() body: SaveOAuthAppDto,
  ) {
    const {
      providerSlug,
      clientId,
      clientSecret,
      customScopes,
    } = body;

    // Validate provider
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (manifest.auth.type !== 'oauth2') {
      throw new HttpException(
        `Provider ${providerSlug} does not use OAuth`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate required fields
    if (!clientId || !clientSecret) {
      throw new HttpException(
        'clientId and clientSecret are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.oauthCredentialsService.saveOrgCredentials(
      providerSlug,
      organizationId,
      clientId,
      clientSecret,
      customScopes,
    );

    this.logger.log(
      `Saved custom OAuth app for ${providerSlug}, org: ${organizationId}`,
    );

    return { success: true };
  }

  /**
   * Delete custom OAuth app credentials for an organization
   */
  @Delete(':providerSlug')
  @RequirePermission('integration', 'delete')
  async deleteOAuthApp(
    @Param('providerSlug') providerSlug: string,
    @OrganizationId() organizationId: string,
  ) {
    await this.oauthCredentialsService.deleteOrgCredentials(
      providerSlug,
      organizationId,
    );

    this.logger.log(
      `Deleted custom OAuth app for ${providerSlug}, org: ${organizationId}`,
    );

    return { success: true };
  }
}

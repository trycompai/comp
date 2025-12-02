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
} from '@nestjs/common';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { OAuthAppRepository } from '../repositories/oauth-app.repository';
import { getManifest } from '@comp/integration-platform';

interface SaveOAuthAppDto {
  providerSlug: string;
  organizationId: string;
  clientId: string;
  clientSecret: string;
  customScopes?: string[];
}

@Controller({ path: 'integrations/oauth-apps', version: '1' })
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
  async listOAuthApps(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

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
  async getSetupInfo(
    @Param('providerSlug') providerSlug: string,
    @Query('organizationId') organizationId: string,
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
  async saveOAuthApp(@Body() body: SaveOAuthAppDto) {
    const {
      providerSlug,
      organizationId,
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
  async deleteOAuthApp(
    @Param('providerSlug') providerSlug: string,
    @Query('organizationId') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

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

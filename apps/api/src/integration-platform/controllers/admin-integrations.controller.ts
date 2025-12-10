import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { PlatformCredentialRepository } from '../repositories/platform-credential.repository';
import { getAllManifests, getManifest } from '@comp/integration-platform';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';

interface SavePlatformCredentialDto {
  providerSlug: string;
  clientId: string;
  clientSecret: string;
  customScopes?: string[];
  customSettings?: Record<string, unknown>;
}

@Controller({ path: 'admin/integrations', version: '1' })
@UseGuards(PlatformAdminGuard)
export class AdminIntegrationsController {
  private readonly logger = new Logger(AdminIntegrationsController.name);

  constructor(
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly platformCredentialRepository: PlatformCredentialRepository,
  ) {}

  /**
   * List all integrations with their credential status
   */
  @Get()
  async listIntegrations() {
    const manifests = getAllManifests();
    const platformCredentials =
      await this.platformCredentialRepository.findAll();

    // Create a map of configured credentials
    const configuredProviders = new Set(
      platformCredentials.map((c) => c.providerSlug),
    );

    return manifests.map((manifest) => {
      const credential = platformCredentials.find(
        (c) => c.providerSlug === manifest.id,
      );

      return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        category: manifest.category,
        logoUrl: manifest.logoUrl,
        authType: manifest.auth.type,
        capabilities: manifest.capabilities,
        isActive: manifest.isActive,
        docsUrl: manifest.docsUrl,
        // Credential status
        hasCredentials: configuredProviders.has(manifest.id),
        credentialConfiguredAt: credential?.createdAt,
        credentialUpdatedAt: credential?.updatedAt,
        // OAuth-specific info
        ...(manifest.auth.type === 'oauth2' && {
          setupInstructions: manifest.auth.config.setupInstructions,
          createAppUrl: manifest.auth.config.createAppUrl,
          requiredScopes: manifest.auth.config.scopes,
          authorizeUrl: manifest.auth.config.authorizeUrl,
          additionalOAuthSettings:
            manifest.auth.config.additionalOAuthSettings || [],
        }),
      };
    });
  }

  /**
   * Get details for a specific integration
   */
  @Get(':providerSlug')
  async getIntegration(@Param('providerSlug') providerSlug: string) {
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const credential =
      await this.platformCredentialRepository.findByProviderSlug(providerSlug);

    return {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      category: manifest.category,
      authType: manifest.auth.type,
      capabilities: manifest.capabilities,
      isActive: manifest.isActive,
      docsUrl: manifest.docsUrl,
      // Credential status (don't expose actual credentials)
      hasCredentials: !!credential,
      credentialIsActive: credential?.isActive ?? false,
      credentialConfiguredAt: credential?.createdAt,
      credentialUpdatedAt: credential?.updatedAt,
      credentialCustomScopes: credential?.customScopes,
      // OAuth-specific info
      ...(manifest.auth.type === 'oauth2' && {
        setupInstructions: manifest.auth.config.setupInstructions,
        createAppUrl: manifest.auth.config.createAppUrl,
        requiredScopes: manifest.auth.config.scopes,
        callbackUrl: `${process.env.BASE_URL || 'http://localhost:3333'}/v1/integrations/oauth/callback`,
        additionalOAuthSettings:
          manifest.auth.config.additionalOAuthSettings || [],
      }),
    };
  }

  /**
   * Save platform credentials for an integration
   */
  @Post('credentials')
  async savePlatformCredentials(
    @Body() body: SavePlatformCredentialDto,
    // TODO: Get userId from auth context
  ) {
    const {
      providerSlug,
      clientId,
      clientSecret,
      customScopes,
      customSettings,
    } = body;

    // Validate provider exists
    const manifest = getManifest(providerSlug);
    if (!manifest) {
      throw new HttpException(
        `Provider ${providerSlug} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate it's an OAuth provider
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

    await this.oauthCredentialsService.savePlatformCredentials(
      providerSlug,
      clientId,
      clientSecret,
      customScopes,
      customSettings,
      // userId from auth context would go here
    );

    this.logger.log(`Platform credentials saved for ${providerSlug}`);

    return { success: true };
  }

  /**
   * Delete platform credentials for an integration
   */
  @Delete('credentials/:providerSlug')
  async deletePlatformCredentials(@Param('providerSlug') providerSlug: string) {
    const credential =
      await this.platformCredentialRepository.findByProviderSlug(providerSlug);

    if (!credential) {
      throw new HttpException(
        `No credentials found for ${providerSlug}`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.oauthCredentialsService.deletePlatformCredentials(providerSlug);

    this.logger.log(`Platform credentials deleted for ${providerSlug}`);

    return { success: true };
  }
}

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
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import {
  CredentialVaultService,
  type EncryptedData,
} from '../services/credential-vault.service';
import { PlatformCredentialRepository } from '../repositories/platform-credential.repository';
import { getAllManifests, getManifest } from '@trycompai/integration-platform';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { PlatformAuditLogInterceptor } from '../interceptors/platform-audit-log.interceptor';

interface SavePlatformCredentialDto {
  providerSlug: string;
  clientId: string;
  clientSecret: string;
  customScopes?: string[];
  customSettings?: Record<string, unknown>;
}

@ApiExcludeController()
@Controller({ path: 'admin/integrations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(PlatformAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminIntegrationsController {
  private readonly logger = new Logger(AdminIntegrationsController.name);

  constructor(
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly platformCredentialRepository: PlatformCredentialRepository,
    private readonly credentialVaultService: CredentialVaultService,
  ) {}

  @Get()
  async listIntegrations() {
    const manifests = getAllManifests();
    const platformCredentials =
      await this.platformCredentialRepository.findAll();

    const configuredProviders = new Set(
      platformCredentials.map((c) => c.providerSlug),
    );

    return Promise.all(
      manifests.map(async (manifest) => {
        const credential = platformCredentials.find(
          (c) => c.providerSlug === manifest.id,
        );

        const { clientId, clientSecret } = await this.decryptCredential({
          providerSlug: manifest.id,
          encryptedClientId: credential?.encryptedClientId,
          encryptedClientSecret: credential?.encryptedClientSecret,
        });

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
          hasCredentials: configuredProviders.has(manifest.id),
          credentialConfiguredAt: credential?.createdAt,
          credentialUpdatedAt: credential?.updatedAt,
          clientIdHint: credential?.clientIdHint,
          clientSecretHint: credential?.clientSecretHint,
          clientId,
          clientSecret,
          existingCustomSettings:
            (
              credential as
                { customSettings?: Record<string, unknown> } | undefined
            )?.customSettings || undefined,
          ...(manifest.auth.type === 'oauth2' && {
            setupInstructions: manifest.auth.config.setupInstructions,
            createAppUrl: manifest.auth.config.createAppUrl,
            requiredScopes: manifest.auth.config.scopes,
            authorizeUrl: manifest.auth.config.authorizeUrl,
            additionalOAuthSettings:
              manifest.auth.config.additionalOAuthSettings || [],
          }),
        };
      }),
    );
  }

  private async decryptCredential({
    providerSlug,
    encryptedClientId,
    encryptedClientSecret,
  }: {
    providerSlug: string;
    encryptedClientId: unknown;
    encryptedClientSecret: unknown;
  }): Promise<{ clientId: string | null; clientSecret: string | null }> {
    if (!encryptedClientId || !encryptedClientSecret) {
      return { clientId: null, clientSecret: null };
    }

    try {
      const [clientId, clientSecret] = await Promise.all([
        this.credentialVaultService.decrypt(encryptedClientId as EncryptedData),
        this.credentialVaultService.decrypt(
          encryptedClientSecret as EncryptedData,
        ),
      ]);
      return { clientId, clientSecret };
    } catch (error) {
      this.logger.error(
        `Failed to read platform credentials for ${providerSlug}: ${error}`,
      );
      return { clientId: null, clientSecret: null };
    }
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
    @Req() req: { userId: string },
  ) {
    const {
      providerSlug,
      clientId,
      clientSecret,
      customScopes,
      customSettings,
    } = body;

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
      req.userId,
    );

    this.logger.log(
      `Platform credentials saved for ${providerSlug} by ${req.userId}`,
    );

    return { success: true };
  }

  @Delete('credentials/:providerSlug')
  async deletePlatformCredentials(
    @Param('providerSlug') providerSlug: string,
    @Req() req: { userId: string },
  ) {
    const credential =
      await this.platformCredentialRepository.findByProviderSlug(providerSlug);

    if (!credential) {
      throw new HttpException(
        `No credentials found for ${providerSlug}`,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.oauthCredentialsService.deletePlatformCredentials(providerSlug);

    this.logger.log(
      `Platform credentials deleted for ${providerSlug} by ${req.userId}`,
    );

    return { success: true };
  }
}

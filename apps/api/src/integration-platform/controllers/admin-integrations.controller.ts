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
import { Throttle } from '@nestjs/throttler';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { PlatformCredentialRepository } from '../repositories/platform-credential.repository';
import {
  CredentialVaultService,
  type EncryptedData,
} from '../services/credential-vault.service';
import { getAllManifests, getManifest } from '@comp/integration-platform';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { PlatformAuditLogInterceptor } from '../interceptors/platform-audit-log.interceptor';

interface SavePlatformCredentialDto {
  providerSlug: string;
  clientId: string;
  clientSecret: string;
  customScopes?: string[];
  customSettings?: Record<string, unknown>;
}

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

  private maskSecret(value: string): string {
    if (value.length <= 4) return '\u2022'.repeat(value.length);
    return '\u2022'.repeat(value.length - 4) + value.slice(-4);
  }

  private async getCredentialHints(credential: {
    encryptedClientId: unknown;
    encryptedClientSecret: unknown;
  }): Promise<{ clientIdHint: string; clientSecretHint: string }> {
    try {
      const [clientId, clientSecret] = await Promise.all([
        this.credentialVaultService.decrypt(
          credential.encryptedClientId as EncryptedData,
        ),
        this.credentialVaultService.decrypt(
          credential.encryptedClientSecret as EncryptedData,
        ),
      ]);
      return {
        clientIdHint: this.maskSecret(clientId),
        clientSecretHint: this.maskSecret(clientSecret),
      };
    } catch {
      return { clientIdHint: '\u2022\u2022\u2022\u2022', clientSecretHint: '\u2022\u2022\u2022\u2022' };
    }
  }

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

        const hints = credential
          ? await this.getCredentialHints(credential)
          : undefined;

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
          clientIdHint: hints?.clientIdHint,
          clientSecretHint: hints?.clientSecretHint,
          existingCustomSettings:
            (credential as { customSettings?: Record<string, unknown> } | undefined)
              ?.customSettings || undefined,
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

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { OAuthStateRepository } from '../repositories/oauth-state.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { ConnectionService } from '../services/connection.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';
import { getManifest, type OAuthConfig } from '@comp/integration-platform';

interface StartOAuthDto {
  providerSlug: string;
  organizationId: string;
  userId: string;
  redirectUrl?: string;
}

interface OAuthCallbackQuery {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

@Controller({ path: 'integrations/oauth', version: '1' })
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthStateRepository: OAuthStateRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly connectionService: ConnectionService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly autoCheckRunnerService: AutoCheckRunnerService,
  ) {}

  /**
   * Check if OAuth credentials are available for a provider
   */
  @Get('availability')
  async checkAvailability(
    @Query('providerSlug') providerSlug: string,
    @Query('organizationId') organizationId: string,
  ) {
    if (!providerSlug || !organizationId) {
      throw new HttpException(
        'providerSlug and organizationId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.oauthCredentialsService.checkAvailability(
      providerSlug,
      organizationId,
    );
  }

  /**
   * Start OAuth flow - returns authorization URL
   */
  @Post('start')
  async startOAuth(
    @Body() body: StartOAuthDto,
  ): Promise<{ authorizationUrl: string }> {
    const { providerSlug, organizationId, userId, redirectUrl } = body;

    // Get manifest and OAuth config
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

    // Get OAuth credentials (org-level or platform-level)
    const credentials = await this.oauthCredentialsService.getCredentials(
      providerSlug,
      organizationId,
    );

    if (!credentials) {
      const availability = await this.oauthCredentialsService.checkAvailability(
        providerSlug,
        organizationId,
      );
      throw new HttpException(
        {
          message: `No OAuth credentials available for ${providerSlug}`,
          setupInstructions: availability.setupInstructions,
          createAppUrl: availability.createAppUrl,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    // Ensure provider exists in DB
    await this.providerRepository.upsert({
      slug: manifest.id,
      name: manifest.name,
      category: manifest.category,
      capabilities: manifest.capabilities,
      isActive: manifest.isActive,
    });

    // Generate PKCE code verifier if needed
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;

    if (oauthConfig.pkce) {
      codeVerifier = randomBytes(32).toString('base64url');
      codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    }

    // Create OAuth state record
    const oauthState = await this.oauthStateRepository.create({
      providerSlug,
      organizationId,
      userId,
      codeVerifier,
      redirectUrl,
    });

    // Build authorization URL, replacing any placeholders with additional OAuth settings
    let authorizeUrl = oauthConfig.authorizeUrl;
    if (credentials.customSettings && oauthConfig.additionalOAuthSettings) {
      // Dynamically replace tokens based on additionalOAuthSettings definition
      for (const setting of oauthConfig.additionalOAuthSettings) {
        if (setting.token && credentials.customSettings[setting.id]) {
          authorizeUrl = authorizeUrl.replace(
            setting.token,
            String(credentials.customSettings[setting.id]),
          );
        }
      }
    }
    const authUrl = new URL(authorizeUrl);

    // Standard OAuth2 params
    authUrl.searchParams.set('client_id', credentials.clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', oauthState.state);

    // Callback URL
    const callbackUrl = `${process.env.BASE_URL || 'http://localhost:3333'}/v1/integrations/oauth/callback`;
    authUrl.searchParams.set('redirect_uri', callbackUrl);

    // Scopes
    if (credentials.scopes.length > 0) {
      authUrl.searchParams.set('scope', credentials.scopes.join(' '));
    }

    // PKCE
    if (codeChallenge) {
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
    }

    // Additional authorization params from manifest
    if (oauthConfig.authorizationParams) {
      for (const [key, value] of Object.entries(
        oauthConfig.authorizationParams,
      )) {
        authUrl.searchParams.set(key, String(value));
      }
    }

    this.logger.log(
      `Starting OAuth flow for ${providerSlug}, org: ${organizationId} (credentials from ${credentials.source})`,
    );

    return { authorizationUrl: authUrl.toString() };
  }

  /**
   * OAuth callback - exchanges code for tokens
   */
  @Get('callback')
  async oauthCallback(
    @Query() query: OAuthCallbackQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { code, state, error, error_description } = query;

    // Handle OAuth errors
    if (error) {
      this.logger.error(`OAuth error: ${error} - ${error_description}`);
      const errorUrl = this.buildRedirectUrl(null, {
        error,
        error_description: error_description || 'OAuth authorization failed',
      });
      res.redirect(errorUrl);
      return;
    }

    if (!code || !state) {
      const errorUrl = this.buildRedirectUrl(null, {
        error: 'invalid_request',
        error_description: 'Missing code or state parameter',
      });
      res.redirect(errorUrl);
      return;
    }

    // Validate state
    const oauthState = await this.oauthStateRepository.findByState(state);
    if (!oauthState) {
      const errorUrl = this.buildRedirectUrl(null, {
        error: 'invalid_state',
        error_description: 'Invalid or expired OAuth state',
      });
      res.redirect(errorUrl);
      return;
    }

    if (oauthState.expiresAt < new Date()) {
      await this.oauthStateRepository.delete(state);
      const errorUrl = this.buildRedirectUrl(
        oauthState.redirectUrl,
        {
          error: 'expired_state',
          error_description: 'OAuth state has expired',
        },
        oauthState.organizationId,
      );
      res.redirect(errorUrl);
      return;
    }

    try {
      // Get manifest and OAuth config
      const manifest = getManifest(oauthState.providerSlug);
      if (!manifest || manifest.auth.type !== 'oauth2') {
        throw new Error(`Invalid provider: ${oauthState.providerSlug}`);
      }

      const oauthConfig = manifest.auth.config;

      // Get OAuth credentials
      const credentials = await this.oauthCredentialsService.getCredentials(
        oauthState.providerSlug,
        oauthState.organizationId,
      );

      if (!credentials) {
        throw new Error('OAuth credentials no longer available');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(
        oauthConfig,
        credentials,
        code,
        oauthState.codeVerifier,
      );

      // Get or create provider
      const provider = await this.providerRepository.findBySlug(
        oauthState.providerSlug,
      );
      if (!provider) {
        throw new Error(`Provider not found: ${oauthState.providerSlug}`);
      }

      // Get or create connection
      let connection = await this.connectionRepository.findByProviderAndOrg(
        provider.id,
        oauthState.organizationId,
      );

      if (!connection) {
        connection = await this.connectionService.createConnection({
          providerSlug: oauthState.providerSlug,
          organizationId: oauthState.organizationId,
          authStrategy: 'oauth2',
        });
      }

      // Store tokens
      await this.credentialVaultService.storeOAuthTokens(connection.id, tokens);

      // Provider-specific post-OAuth actions
      if (oauthState.providerSlug === 'rippling') {
        // Rippling requires calling mark_app_installed to finalize
        // See: https://developer.rippling.com/documentation/developer-portal/v2-guides/installation
        await this.markRipplingAppInstalled(tokens.access_token);
      }

      // Clean up state
      await this.oauthStateRepository.delete(state);

      this.logger.log(
        `OAuth completed for ${oauthState.providerSlug}, org: ${oauthState.organizationId}`,
      );

      // Auto-run checks if possible (fire and forget - don't block the redirect)
      this.autoCheckRunnerService
        .tryAutoRunChecks(connection.id)
        .then((didRun) => {
          if (didRun) {
            this.logger.log(
              `Auto-ran checks for ${oauthState.providerSlug} after OAuth`,
            );
          }
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to auto-run checks after OAuth: ${err.message}`,
          );
        });

      // Redirect to success URL
      const successUrl = this.buildRedirectUrl(
        oauthState.redirectUrl,
        {
          success: 'true',
          provider: oauthState.providerSlug,
        },
        oauthState.organizationId,
      );
      res.redirect(successUrl);
    } catch (err) {
      this.logger.error(`OAuth callback error: ${err}`);
      await this.oauthStateRepository.delete(state);

      const errorUrl = this.buildRedirectUrl(
        oauthState.redirectUrl,
        {
          error: 'token_exchange_failed',
          error_description:
            err instanceof Error
              ? err.message
              : 'Failed to exchange code for tokens',
        },
        oauthState.organizationId,
      );
      res.redirect(errorUrl);
    }
  }

  private async exchangeCodeForTokens(
    config: OAuthConfig,
    credentials: { clientId: string; clientSecret: string },
    code: string,
    codeVerifier?: string | null,
  ): Promise<{
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  }> {
    const callbackUrl = `${process.env.BASE_URL || 'http://localhost:3333'}/v1/integrations/oauth/callback`;

    // Build token request body
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
    });

    // Add PKCE verifier if present
    if (codeVerifier) {
      body.set('code_verifier', codeVerifier);
    }

    // Add additional token params from manifest
    if (config.tokenParams) {
      for (const [key, value] of Object.entries(config.tokenParams)) {
        body.set(key, String(value));
      }
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    // Add client credentials based on auth method
    if (config.clientAuthMethod === 'header') {
      const creds = Buffer.from(
        `${credentials.clientId}:${credentials.clientSecret}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${creds}`;
    } else {
      // Default: send in body
      body.set('client_id', credentials.clientId);
      body.set('client_secret', credentials.clientSecret);
    }

    // Make token request
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    if (!response.ok) {
      await response.text(); // consume body
      this.logger.error(`Token exchange failed: ${response.status}`);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens = await response.json();

    if (!tokens.access_token) {
      throw new Error('No access token in response');
    }

    return tokens;
  }

  /**
   * Mark Rippling app as installed (required by Rippling)
   * See: https://developer.rippling.com/documentation/developer-portal/v2-guides/installation
   */
  private async markRipplingAppInstalled(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        'https://api.rippling.com/platform/api/mark_app_installed',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Failed to mark Rippling app as installed: ${response.status} - ${errorText}`,
        );
        // Don't throw - the OAuth flow itself succeeded
      } else {
        await response.json(); // consume body
        this.logger.log('Rippling app marked as installed');
      }
    } catch (error) {
      this.logger.warn(`Error marking Rippling app as installed: ${error}`);
      // Don't throw - the OAuth flow itself succeeded
    }
  }

  private buildRedirectUrl(
    baseUrl: string | null | undefined,
    params: Record<string, string>,
    organizationId?: string,
  ): string {
    // Use provided URL or build default with org ID
    let targetUrl: string;
    if (baseUrl) {
      targetUrl = baseUrl;
    } else {
      targetUrl = `${process.env.APP_URL || 'http://localhost:3000'}`;
      if (organizationId) {
        targetUrl += `/${organizationId}/integrations`;
      } else {
        targetUrl += '/integrations';
      }
    }

    const url = new URL(targetUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }
}

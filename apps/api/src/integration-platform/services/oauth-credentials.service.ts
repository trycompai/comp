import { Injectable, Logger } from '@nestjs/common';
import { OAuthAppRepository } from '../repositories/oauth-app.repository';
import { PlatformCredentialRepository } from '../repositories/platform-credential.repository';
import {
  CredentialVaultService,
  EncryptedData,
} from './credential-vault.service';
import { getManifest, type OAuthConfig } from '@comp/integration-platform';
import type { Prisma } from '@prisma/client';

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  /** Where the credentials came from */
  source: 'organization' | 'platform';
  /** Provider-specific custom settings (e.g., Rippling app name) */
  customSettings?: Record<string, unknown>;
}

export interface OAuthCredentialsAvailability {
  /** Whether credentials are available (from any source) */
  available: boolean;
  /** Whether org has custom credentials configured */
  hasOrgCredentials: boolean;
  /** Whether platform has credentials configured */
  hasPlatformCredentials: boolean;
  /** Instructions for setting up custom OAuth app (if no credentials available) */
  setupInstructions?: string;
  /** URL to create OAuth app */
  createAppUrl?: string;
}

@Injectable()
export class OAuthCredentialsService {
  private readonly logger = new Logger(OAuthCredentialsService.name);

  constructor(
    private readonly oauthAppRepository: OAuthAppRepository,
    private readonly platformCredentialRepository: PlatformCredentialRepository,
    private readonly credentialVaultService: CredentialVaultService,
  ) {}

  /**
   * Get OAuth credentials for a provider, checking org-level first, then platform-level
   */
  async getCredentials(
    providerSlug: string,
    organizationId: string,
  ): Promise<OAuthCredentials | null> {
    const manifest = getManifest(providerSlug);
    if (!manifest || manifest.auth.type !== 'oauth2') {
      return null;
    }

    const oauthConfig = manifest.auth.config;

    // 1. Check for org-level custom credentials first
    const orgCredentials = await this.getOrgCredentials(
      providerSlug,
      organizationId,
      oauthConfig,
    );
    if (orgCredentials) {
      return orgCredentials;
    }

    // 2. Fall back to platform-level credentials (from database)
    const platformCredentials = await this.getPlatformCredentials(
      providerSlug,
      oauthConfig,
    );
    if (platformCredentials) {
      return platformCredentials;
    }

    return null;
  }

  /**
   * Check what credentials are available for a provider
   */
  async checkAvailability(
    providerSlug: string,
    organizationId: string,
  ): Promise<OAuthCredentialsAvailability> {
    const manifest = getManifest(providerSlug);
    if (!manifest || manifest.auth.type !== 'oauth2') {
      return {
        available: false,
        hasOrgCredentials: false,
        hasPlatformCredentials: false,
      };
    }

    const oauthConfig = manifest.auth.config;

    // Check org credentials
    const orgApp = await this.oauthAppRepository.findActiveByProviderAndOrg(
      providerSlug,
      organizationId,
    );
    const hasOrgCredentials = !!orgApp;

    // Check platform credentials (from database)
    const platformCred =
      await this.platformCredentialRepository.findActiveByProviderSlug(
        providerSlug,
      );
    const hasPlatformCredentials = !!platformCred;

    return {
      available: hasOrgCredentials || hasPlatformCredentials,
      hasOrgCredentials,
      hasPlatformCredentials,
      setupInstructions: oauthConfig.setupInstructions,
      createAppUrl: oauthConfig.createAppUrl,
    };
  }

  /**
   * Save custom OAuth app credentials for an organization
   */
  async saveOrgCredentials(
    providerSlug: string,
    organizationId: string,
    clientId: string,
    clientSecret: string,
    customScopes?: string[],
    customSettings?: Prisma.InputJsonValue,
  ): Promise<void> {
    const encryptedClientId =
      await this.credentialVaultService.encrypt(clientId);
    const encryptedClientSecret =
      await this.credentialVaultService.encrypt(clientSecret);

    await this.oauthAppRepository.upsert({
      providerSlug,
      organizationId,
      encryptedClientId,
      encryptedClientSecret,
      customScopes,
      customSettings: customSettings,
    });

    this.logger.log(
      `Saved custom OAuth credentials for ${providerSlug}, org: ${organizationId}`,
    );
  }

  /**
   * Delete custom OAuth app credentials for an organization
   */
  async deleteOrgCredentials(
    providerSlug: string,
    organizationId: string,
  ): Promise<void> {
    await this.oauthAppRepository.delete(providerSlug, organizationId);
    this.logger.log(
      `Deleted custom OAuth credentials for ${providerSlug}, org: ${organizationId}`,
    );
  }

  /**
   * Save platform-wide OAuth credentials (admin only)
   */
  async savePlatformCredentials(
    providerSlug: string,
    clientId: string,
    clientSecret: string,
    customScopes?: string[],
    customSettings?: Record<string, unknown>,
    userId?: string,
  ): Promise<void> {
    const encryptedClientId =
      await this.credentialVaultService.encrypt(clientId);
    const encryptedClientSecret =
      await this.credentialVaultService.encrypt(clientSecret);

    await this.platformCredentialRepository.upsert({
      providerSlug,
      encryptedClientId,
      encryptedClientSecret,
      customScopes,
      customSettings: customSettings as Prisma.InputJsonValue | undefined,
      createdById: userId,
    });

    this.logger.log(`Saved platform OAuth credentials for ${providerSlug}`);
  }

  /**
   * Delete platform-wide OAuth credentials (admin only)
   */
  async deletePlatformCredentials(providerSlug: string): Promise<void> {
    await this.platformCredentialRepository.delete(providerSlug);
    this.logger.log(`Deleted platform OAuth credentials for ${providerSlug}`);
  }

  /**
   * Get all platform credentials (for admin UI)
   */
  async getAllPlatformCredentials() {
    return this.platformCredentialRepository.findAll();
  }

  /**
   * Get org-level OAuth credentials
   */
  private async getOrgCredentials(
    providerSlug: string,
    organizationId: string,
    oauthConfig: OAuthConfig,
  ): Promise<OAuthCredentials | null> {
    const orgApp = await this.oauthAppRepository.findActiveByProviderAndOrg(
      providerSlug,
      organizationId,
    );

    if (!orgApp) {
      return null;
    }

    try {
      const clientId = await this.credentialVaultService.decrypt(
        orgApp.encryptedClientId as unknown as EncryptedData,
      );
      const clientSecret = await this.credentialVaultService.decrypt(
        orgApp.encryptedClientSecret as unknown as EncryptedData,
      );

      // Use custom scopes if provided, otherwise fall back to manifest defaults
      const scopes =
        orgApp.customScopes.length > 0
          ? orgApp.customScopes
          : oauthConfig.scopes;

      return {
        clientId,
        clientSecret,
        scopes,
        source: 'organization',
        customSettings:
          (orgApp.customSettings as Record<string, unknown>) || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to decrypt org OAuth credentials: ${error}`);
      return null;
    }
  }

  /**
   * Get platform-level OAuth credentials from database
   */
  private async getPlatformCredentials(
    providerSlug: string,
    oauthConfig: OAuthConfig,
  ): Promise<OAuthCredentials | null> {
    const platformCred =
      await this.platformCredentialRepository.findActiveByProviderSlug(
        providerSlug,
      );

    if (!platformCred) {
      return null;
    }

    try {
      const clientId = await this.credentialVaultService.decrypt(
        platformCred.encryptedClientId as unknown as EncryptedData,
      );
      const clientSecret = await this.credentialVaultService.decrypt(
        platformCred.encryptedClientSecret as unknown as EncryptedData,
      );

      // Use custom scopes if provided, otherwise fall back to manifest defaults
      const scopes =
        platformCred.customScopes.length > 0
          ? platformCred.customScopes
          : oauthConfig.scopes;

      return {
        clientId,
        clientSecret,
        scopes,
        source: 'platform',
        customSettings: (
          platformCred as { customSettings?: Record<string, unknown> }
        ).customSettings,
      };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt platform OAuth credentials: ${error}`,
      );
      return null;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { getManifest } from '@comp/integration-platform';
import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import { OAuthCredentialsService } from '../integration-platform/services/oauth-credentials.service';
import { GCPSecurityService } from './providers/gcp-security.service';
import { AWSSecurityService } from './providers/aws-security.service';
import { AzureSecurityService } from './providers/azure-security.service';

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  resourceType: string;
  resourceId: string;
  remediation?: string;
  evidence?: Record<string, unknown>;
  createdAt: string;
  passed?: boolean; // Whether this is a passing check (default: false)
}

export interface ScanResult {
  success: boolean;
  provider: string;
  findings: SecurityFinding[];
  scannedAt: string;
  error?: string;
}

@Injectable()
export class CloudSecurityService {
  private readonly logger = new Logger(CloudSecurityService.name);

  constructor(
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly gcpService: GCPSecurityService,
    private readonly awsService: AWSSecurityService,
    private readonly azureService: AzureSecurityService,
  ) {}

  async scan(
    connectionId: string,
    organizationId: string,
  ): Promise<ScanResult> {
    this.logger.log(
      `Starting cloud security scan for connection ${connectionId}`,
    );

    // Get connection
    const connection = await db.integrationConnection.findFirst({
      where: {
        id: connectionId,
        organizationId,
        status: 'active',
      },
      include: {
        provider: true,
      },
    });

    if (!connection) {
      return {
        success: false,
        provider: 'unknown',
        findings: [],
        scannedAt: new Date().toISOString(),
        error: 'Connection not found or inactive',
      };
    }

    const providerSlug = connection.provider.slug;
    this.logger.log(`Scanning ${providerSlug} provider`);

    // Get credentials - for OAuth providers, handle token refresh
    let credentials: Record<string, unknown>;
    try {
      const manifest = getManifest(providerSlug);
      const isOAuth = manifest?.auth?.type === 'oauth2';

      if (isOAuth && manifest.auth.type === 'oauth2') {
        const oauthConfig = manifest.auth.config;

        // Get OAuth app credentials (decrypted)
        const oauthCreds = await this.oauthCredentialsService.getCredentials(
          providerSlug,
          organizationId,
        );

        if (!oauthCreds) {
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: 'OAuth app not configured for this provider',
          };
        }

        // Get valid access token (with refresh if needed)
        const accessToken =
          await this.credentialVaultService.getValidAccessToken(connectionId, {
            tokenUrl: oauthConfig.tokenUrl,
            clientId: oauthCreds.clientId,
            clientSecret: oauthCreds.clientSecret,
            clientAuthMethod: oauthConfig.clientAuthMethod,
          });

        if (!accessToken) {
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: 'OAuth token expired. Please reconnect the integration.',
          };
        }

        // Get full credentials and update with fresh access token
        const decrypted =
          await this.credentialVaultService.getDecryptedCredentials(
            connectionId,
          );
        credentials = { ...decrypted, access_token: accessToken };
      } else {
        // Non-OAuth (custom auth like AWS IAM Role)
        const decrypted =
          await this.credentialVaultService.getDecryptedCredentials(
            connectionId,
          );
        if (!decrypted) {
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: 'No credentials found',
          };
        }
        credentials = decrypted;
      }
    } catch (error) {
      this.logger.error(`Failed to get credentials: ${error}`);
      return {
        success: false,
        provider: providerSlug,
        findings: [],
        scannedAt: new Date().toISOString(),
        error: 'Failed to get credentials',
      };
    }

    // Get variables for the scan
    const variables = (connection.variables as Record<string, unknown>) || {};

    try {
      let findings: SecurityFinding[];

      switch (providerSlug) {
        case 'gcp':
          findings = await this.gcpService.scanSecurityFindings(
            credentials,
            variables,
          );
          break;
        case 'aws':
          findings = await this.awsService.scanSecurityFindings(
            credentials,
            variables,
          );
          break;
        case 'azure':
          findings = await this.azureService.scanSecurityFindings(
            credentials,
            variables,
          );
          break;
        default:
          return {
            success: false,
            provider: providerSlug,
            findings: [],
            scannedAt: new Date().toISOString(),
            error: `Unsupported provider: ${providerSlug}`,
          };
      }

      // Store findings in database
      await this.storeFindings(connectionId, providerSlug, findings);

      // Update last sync time
      await db.integrationConnection.update({
        where: { id: connectionId },
        data: { lastSyncAt: new Date() },
      });

      this.logger.log(
        `Scan complete: ${findings.length} findings for ${providerSlug}`,
      );

      return {
        success: true,
        provider: providerSlug,
        findings,
        scannedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Scan failed for ${providerSlug}: ${errorMessage}`);

      return {
        success: false,
        provider: providerSlug,
        findings: [],
        scannedAt: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  private async storeFindings(
    connectionId: string,
    provider: string,
    findings: SecurityFinding[],
  ): Promise<void> {
    const passedCount = findings.filter((f) => f.passed).length;
    const failedCount = findings.filter((f) => !f.passed).length;

    // Create a scan run record
    const scanRun = await db.integrationCheckRun.create({
      data: {
        connectionId,
        checkId: `${provider}-security-scan`,
        checkName: `${provider.toUpperCase()} Security Scan`,
        status: 'success',
        startedAt: new Date(),
        completedAt: new Date(),
        totalChecked: findings.length,
        passedCount,
        failedCount,
      },
    });

    // Store each finding as a check result
    if (findings.length > 0) {
      await db.integrationCheckResult.createMany({
        data: findings.map((finding) => ({
          checkRunId: scanRun.id,
          passed: finding.passed ?? false,
          resourceType: finding.resourceType,
          resourceId: finding.resourceId,
          title: finding.title,
          description: finding.description,
          severity: finding.passed ? 'info' : finding.severity, // Passed checks are info level
          remediation: finding.remediation,
          evidence: (finding.evidence || {}) as object,
          collectedAt: new Date(finding.createdAt),
        })),
      });
    }
  }
}

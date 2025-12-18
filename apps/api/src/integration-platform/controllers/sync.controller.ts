import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { db } from '@db';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import { getManifest, type OAuthConfig } from '@comp/integration-platform';

interface SyncQuery {
  organizationId: string;
  connectionId: string;
}

interface GoogleWorkspaceUser {
  id: string;
  primaryEmail: string;
  name: {
    fullName: string;
    givenName?: string;
    familyName?: string;
  };
  isAdmin?: boolean;
  suspended?: boolean;
  orgUnitPath?: string;
}

interface GoogleWorkspaceUsersResponse {
  users?: GoogleWorkspaceUser[];
  nextPageToken?: string;
}

@Controller({ path: 'integrations/sync', version: '1' })
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
  ) {}

  /**
   * Sync employees from Google Workspace
   */
  @Post('google-workspace/employees')
  async syncGoogleWorkspaceEmployees(@Query() query: SyncQuery) {
    const { organizationId, connectionId } = query;

    if (!organizationId || !connectionId) {
      throw new HttpException(
        'organizationId and connectionId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get the connection
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    // Get the provider to check the slug
    const provider = await db.integrationProvider.findUnique({
      where: { id: connection.providerId },
    });

    if (!provider || provider.slug !== 'google-workspace') {
      throw new HttpException(
        'This endpoint only supports Google Workspace connections',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get the manifest
    const manifest = getManifest('google-workspace');
    if (!manifest) {
      throw new HttpException(
        'Google Workspace manifest not found',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Get credentials
    let credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);
    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found. Please reconnect the integration.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Try to refresh the token if it might be expired (Google tokens expire after 1 hour)
    if (manifest.auth.type === 'oauth2' && credentials.refresh_token) {
      const oauthConfig = manifest.auth.config;
      try {
        // Get OAuth credentials (client ID/secret) for the refresh
        const oauthCredentials =
          await this.oauthCredentialsService.getCredentials(
            'google-workspace',
            organizationId,
          );

        if (oauthCredentials) {
          const newToken = await this.credentialVaultService.refreshOAuthTokens(
            connectionId,
            {
              tokenUrl: oauthConfig.tokenUrl,
              refreshUrl: oauthConfig.refreshUrl,
              clientId: oauthCredentials.clientId,
              clientSecret: oauthCredentials.clientSecret,
              clientAuthMethod: oauthConfig.clientAuthMethod,
            },
          );
          if (newToken) {
            // Re-fetch credentials to get the new token
            credentials =
              await this.credentialVaultService.getDecryptedCredentials(
                connectionId,
              );
            if (!credentials?.access_token) {
              throw new Error('Failed to get refreshed credentials');
            }
            this.logger.log(
              'Successfully refreshed Google Workspace OAuth token',
            );
          }
        }
      } catch (refreshError) {
        this.logger.warn(
          `Token refresh failed, trying with existing token: ${refreshError}`,
        );
      }
    }

    // Final check that we have valid credentials
    const accessToken = credentials?.access_token;
    if (!accessToken) {
      throw new HttpException(
        'No valid credentials found. Please reconnect the integration.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Fetch users from Google Workspace
    const users: GoogleWorkspaceUser[] = [];
    let nextPageToken: string | undefined;

    try {
      do {
        const url = new URL(
          'https://admin.googleapis.com/admin/directory/v1/users',
        );
        url.searchParams.set('customer', 'my_customer');
        url.searchParams.set('maxResults', '500');
        url.searchParams.set('orderBy', 'email');
        if (nextPageToken) {
          url.searchParams.set('pageToken', nextPageToken);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new HttpException(
              'Google Workspace credentials expired. Please reconnect.',
              HttpStatus.UNAUTHORIZED,
            );
          }
          const errorText = await response.text();
          this.logger.error(
            `Google API error: ${response.status} ${response.statusText}`,
          );
          throw new HttpException(
            'Failed to fetch users from Google Workspace',
            HttpStatus.BAD_GATEWAY,
          );
        }

        const data: GoogleWorkspaceUsersResponse = await response.json();
        if (data.users) {
          users.push(...data.users);
        }
        nextPageToken = data.nextPageToken;
      } while (nextPageToken);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error fetching Google Workspace users: ${error}`);
      throw new HttpException(
        'Failed to fetch users from Google Workspace',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Separate active and suspended users
    const activeUsers = users.filter((u) => !u.suspended);
    const suspendedEmails = new Set(
      users.filter((u) => u.suspended).map((u) => u.primaryEmail.toLowerCase()),
    );
    const activeEmails = new Set(
      activeUsers.map((u) => u.primaryEmail.toLowerCase()),
    );

    this.logger.log(
      `Found ${activeUsers.length} active users and ${suspendedEmails.size} suspended users in Google Workspace`,
    );

    // Import users into the organization
    const results = {
      imported: 0,
      skipped: 0,
      deactivated: 0,
      reactivated: 0,
      errors: 0,
      details: [] as Array<{
        email: string;
        status:
          | 'imported'
          | 'skipped'
          | 'deactivated'
          | 'reactivated'
          | 'error';
        reason?: string;
      }>,
    };

    for (const gwUser of activeUsers) {
      // Normalize email to lowercase for consistent database operations
      // This matches how we build suspendedEmails and activeEmails sets
      const normalizedEmail = gwUser.primaryEmail.toLowerCase();

      try {
        // Check if user already exists
        const existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user
          const newUser = await db.user.create({
            data: {
              email: normalizedEmail,
              name: gwUser.name.fullName || normalizedEmail.split('@')[0],
              emailVerified: true, // Google Workspace users are verified
            },
          });
          userId = newUser.id;
        }

        // Check if member already exists in this org
        const existingMember = await db.member.findFirst({
          where: {
            organizationId,
            userId,
          },
        });

        if (existingMember) {
          // If member was deactivated but is now active in GW, reactivate them
          if (existingMember.deactivated) {
            await db.member.update({
              where: { id: existingMember.id },
              data: { deactivated: false, isActive: true },
            });
            results.reactivated++;
            results.details.push({
              email: normalizedEmail,
              status: 'reactivated',
              reason: 'User is active again in Google Workspace',
            });
          } else {
            results.skipped++;
            results.details.push({
              email: normalizedEmail,
              status: 'skipped',
              reason: 'Already a member',
            });
          }
          continue;
        }

        // Create member - always as employee, admins can be promoted manually
        await db.member.create({
          data: {
            organizationId,
            userId,
            role: 'employee',
            isActive: true,
          },
        });

        results.imported++;
        results.details.push({
          email: normalizedEmail,
          status: 'imported',
        });
      } catch (error) {
        this.logger.error(`Error importing Google Workspace user: ${error}`);
        results.errors++;
        results.details.push({
          email: normalizedEmail,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Deactivate members who are suspended OR deleted in Google Workspace
    // Get all active members in this org
    const allOrgMembers = await db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
      },
      include: {
        user: true,
      },
    });

    // Get the domains from ALL users (including suspended) to track which domains Google Workspace manages
    // This ensures members get deactivated even when an entire domain has no active users
    const gwDomains = new Set(
      users.map((u) => u.primaryEmail.split('@')[1]?.toLowerCase()),
    );

    for (const member of allOrgMembers) {
      const memberEmail = member.user.email.toLowerCase();
      const memberDomain = memberEmail.split('@')[1];

      // Only check members whose email domain matches the Google Workspace domain
      if (!memberDomain || !gwDomains.has(memberDomain)) {
        continue;
      }

      // If this member's email is suspended OR not in the active list, deactivate them
      const isSuspended = suspendedEmails.has(memberEmail);
      const isDeleted =
        !activeEmails.has(memberEmail) && !suspendedEmails.has(memberEmail);

      if (isSuspended || isDeleted) {
        try {
          await db.member.update({
            where: { id: member.id },
            data: { deactivated: true, isActive: false },
          });
          results.deactivated++;
          results.details.push({
            email: member.user.email,
            status: 'deactivated',
            reason: isSuspended
              ? 'User is suspended in Google Workspace'
              : 'User was removed from Google Workspace',
          });
        } catch (error) {
          this.logger.error(`Error deactivating member: ${error}`);
        }
      }
    }

    this.logger.log(
      `Google Workspace sync complete: ${results.imported} imported, ${results.reactivated} reactivated, ${results.deactivated} deactivated, ${results.skipped} skipped, ${results.errors} errors`,
    );

    return {
      success: true,
      totalFound: activeUsers.length,
      totalSuspended: suspendedEmails.size,
      ...results,
    };
  }

  /**
   * Check if Google Workspace is connected for an organization
   */
  @Post('google-workspace/status')
  async getGoogleWorkspaceStatus(
    @Query('organizationId') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionRepository.findBySlugAndOrg(
      'google-workspace',
      organizationId,
    );

    if (!connection || connection.status !== 'active') {
      return {
        connected: false,
        connectionId: null,
        lastSyncAt: null,
        nextSyncAt: null,
      };
    }

    return {
      connected: true,
      connectionId: connection.id,
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: connection.nextSyncAt?.toISOString() ?? null,
    };
  }

  /**
   * Sync employees from Rippling
   */
  @Post('rippling/employees')
  async syncRipplingEmployees(@Query() query: SyncQuery) {
    const { organizationId, connectionId } = query;

    if (!organizationId || !connectionId) {
      throw new HttpException(
        'organizationId and connectionId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get the connection
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    // Get the provider to check the slug
    const provider = await db.integrationProvider.findUnique({
      where: { id: connection.providerId },
    });

    if (!provider || provider.slug !== 'rippling') {
      throw new HttpException(
        'This endpoint only supports Rippling connections',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get credentials
    let credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);

    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found. Please reconnect the integration.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Try to refresh the token if it might be expired
    const manifest = getManifest('rippling');
    const oauthConfig =
      manifest?.auth.type === 'oauth2' ? manifest.auth.config : null;

    if (oauthConfig?.supportsRefreshToken && credentials.refresh_token) {
      try {
        const oauthCredentials =
          await this.oauthCredentialsService.getCredentials(
            'rippling',
            organizationId,
          );

        if (oauthCredentials) {
          const newToken = await this.credentialVaultService.refreshOAuthTokens(
            connectionId,
            {
              tokenUrl: oauthConfig.tokenUrl,
              clientId: oauthCredentials.clientId,
              clientSecret: oauthCredentials.clientSecret,
              clientAuthMethod: oauthConfig.clientAuthMethod,
            },
          );
          if (newToken) {
            credentials =
              await this.credentialVaultService.getDecryptedCredentials(
                connectionId,
              );
            if (!credentials?.access_token) {
              throw new Error('Failed to get refreshed credentials');
            }
            this.logger.log('Successfully refreshed Rippling OAuth token');
          }
        }
      } catch (refreshError) {
        this.logger.warn(
          `Token refresh failed, trying with existing token: ${refreshError}`,
        );
      }
    }

    // Verify we still have valid credentials after potential refresh
    if (!credentials?.access_token) {
      throw new HttpException(
        'No valid credentials found after refresh attempt. Please reconnect.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Fetch workers from Rippling V2 REST API
    // See: https://developer.rippling.com/documentation/developer-portal/v2-guides/user-management
    interface RipplingWorker {
      id: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      work_email?: string;
      personal_email?: string;
      status?: string; // 'ACTIVE', 'TERMINATED', etc.
      employment_type?: string;
      start_date?: string;
      termination_date?: string;
      user?: {
        number?: string; // unique employee identifier
      };
    }

    interface RipplingResponse {
      results?: RipplingWorker[];
      next_link?: string;
    }

    const accessToken = credentials.access_token;

    const workers: RipplingWorker[] = [];

    try {
      // Rippling V2 REST API endpoint for listing workers
      // See: https://developer.rippling.com/documentation/developer-portal/v2-guides/user-management
      let nextUrl: string | null = 'https://rest.ripplingapis.com/workers';

      while (nextUrl) {
        this.logger.log('Fetching Rippling workers...');

        const response = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          await response.text(); // consume body
          this.logger.error(
            `Rippling API error: ${response.status} ${response.statusText}`,
          );

          if (response.status === 401) {
            throw new HttpException(
              'Rippling credentials expired. Please reconnect.',
              HttpStatus.UNAUTHORIZED,
            );
          }

          if (response.status === 403) {
            throw new HttpException(
              'Access denied. Make sure the Rippling app has the required scopes and is properly authorized.',
              HttpStatus.FORBIDDEN,
            );
          }

          throw new HttpException(
            `Rippling API error: ${response.status} ${response.statusText}`,
            HttpStatus.BAD_GATEWAY,
          );
        }

        const data: RipplingResponse = await response.json();

        // V2 API returns { results: [...], next_link: "..." }
        if (data.results && Array.isArray(data.results)) {
          workers.push(...data.results);
        } else if (Array.isArray(data)) {
          // Fallback if API returns array directly
          workers.push(...(data as unknown as RipplingWorker[]));
          break;
        }

        // Handle pagination
        nextUrl = data.next_link || null;
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error fetching Rippling workers: ${error}`);
      throw new HttpException(
        `Failed to fetch workers from Rippling: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Helper to get email from worker (V2 uses snake_case)
    const getWorkerEmail = (w: RipplingWorker): string =>
      (w.work_email || w.personal_email || '').toLowerCase();

    // Helper to check if worker is active
    const isWorkerActive = (w: RipplingWorker): boolean => {
      const status = w.status || '';
      return status.toUpperCase() === 'ACTIVE';
    };

    // Filter to active workers only
    const activeWorkers = workers.filter(isWorkerActive);
    const inactiveEmails = new Set(
      workers
        .filter((w) => !isWorkerActive(w))
        .map(getWorkerEmail)
        .filter(Boolean),
    );
    const activeEmails = new Set(
      activeWorkers.map(getWorkerEmail).filter(Boolean),
    );

    this.logger.log(
      `Found ${activeWorkers.length} active workers and ${inactiveEmails.size} inactive/terminated workers in Rippling`,
    );

    // Derive domains from ALL Rippling workers (including inactive) to track which domains Rippling manages
    // This ensures members get deactivated even when an entire domain has no active workers
    const ripplingDomains = new Set(
      workers.map((w) => getWorkerEmail(w).split('@')[1]).filter(Boolean),
    );

    // Get all existing members
    const allOrgMembers = await db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
      },
      include: { user: true },
    });

    const results = {
      imported: 0,
      reactivated: 0,
      deactivated: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{
        email: string;
        status:
          | 'imported'
          | 'skipped'
          | 'deactivated'
          | 'reactivated'
          | 'error';
        reason?: string;
      }>,
    };

    // Process active workers
    for (const worker of activeWorkers) {
      const email = getWorkerEmail(worker);
      if (!email) {
        results.skipped++;
        continue;
      }

      try {
        let userId: string;
        const existingUser = await db.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // V2 API uses snake_case (first_name, last_name)
          const name =
            worker.name ||
            [worker.first_name, worker.last_name].filter(Boolean).join(' ') ||
            email.split('@')[0];

          const newUser = await db.user.create({
            data: {
              email,
              name,
              emailVerified: true,
            },
          });
          userId = newUser.id;
        }

        const existingMember = await db.member.findFirst({
          where: { organizationId, userId },
        });

        if (existingMember) {
          if (existingMember.deactivated) {
            await db.member.update({
              where: { id: existingMember.id },
              data: { deactivated: false, isActive: true },
            });
            results.reactivated++;
            results.details.push({
              email,
              status: 'reactivated',
              reason: 'Worker reactivated in Rippling',
            });
          } else {
            results.skipped++;
            results.details.push({
              email,
              status: 'skipped',
              reason: 'Already an active member',
            });
          }
        } else {
          await db.member.create({
            data: {
              organizationId,
              userId,
              role: 'employee',
              isActive: true,
            },
          });
          results.imported++;
          results.details.push({ email, status: 'imported' });
        }
      } catch (error) {
        this.logger.error(`Error importing Rippling worker: ${error}`);
        results.errors++;
        results.details.push({
          email,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Deactivate members no longer in Rippling
    for (const member of allOrgMembers) {
      const memberEmail = member.user.email.toLowerCase();
      const memberDomain = memberEmail.split('@')[1];

      // Only check members whose email domain matches one of the Rippling domains
      if (!memberDomain || !ripplingDomains.has(memberDomain)) {
        continue;
      }

      if (!activeEmails.has(memberEmail)) {
        const isInactive = inactiveEmails.has(memberEmail);
        const reason = isInactive
          ? 'Employee is inactive in Rippling'
          : 'Employee was removed from Rippling';

        await db.member.update({
          where: { id: member.id },
          data: { deactivated: true, isActive: false },
        });
        results.deactivated++;
        results.details.push({
          email: member.user.email,
          status: 'deactivated',
          reason,
        });
      }
    }

    this.logger.log(
      `Rippling sync complete: ${results.imported} imported, ${results.reactivated} reactivated, ${results.deactivated} deactivated, ${results.skipped} skipped, ${results.errors} errors`,
    );

    return {
      success: true,
      totalFound: workers.length,
      totalInactive: inactiveEmails.size,
      ...results,
    };
  }

  /**
   * Check if Rippling is connected for an organization
   */
  @Post('rippling/status')
  async getRipplingStatus(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionRepository.findBySlugAndOrg(
      'rippling',
      organizationId,
    );

    if (!connection || connection.status !== 'active') {
      return {
        connected: false,
        connectionId: null,
        lastSyncAt: null,
        nextSyncAt: null,
      };
    }

    return {
      connected: true,
      connectionId: connection.id,
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: connection.nextSyncAt?.toISOString() ?? null,
    };
  }

  /**
   * Sync employees from JumpCloud
   */
  @Post('jumpcloud/employees')
  async syncJumpCloudEmployees(@Query() query: SyncQuery) {
    const { organizationId, connectionId } = query;

    if (!organizationId || !connectionId) {
      throw new HttpException(
        'organizationId and connectionId are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get the connection
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    // Get the provider to check the slug
    const provider = await db.integrationProvider.findUnique({
      where: { id: connection.providerId },
    });

    if (!provider || provider.slug !== 'jumpcloud') {
      throw new HttpException(
        'This endpoint only supports JumpCloud connections',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get credentials (API key auth)
    const credentials =
      await this.credentialVaultService.getDecryptedCredentials(connectionId);

    if (!credentials?.api_key) {
      throw new HttpException(
        'No valid API key found. Please reconnect the integration.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // JumpCloud API types
    interface JumpCloudUser {
      _id: string;
      username: string;
      email: string;
      firstname?: string;
      lastname?: string;
      displayname?: string;
      department?: string;
      jobTitle?: string;
      state: 'ACTIVATED' | 'SUSPENDED' | 'STAGED' | 'PENDING_LOCK_STATE';
      activated: boolean;
      suspended: boolean;
      mfa?: { configured: boolean };
      totp_enabled?: boolean;
      created?: string;
    }

    interface JumpCloudUsersResponse {
      totalCount: number;
      results: JumpCloudUser[];
    }

    interface JumpCloudSystem {
      _id: string;
      displayName?: string;
      hostname?: string;
      os?: string;
      version?: string;
      arch?: string;
      serialNumber?: string;
      systemTimezone?: string;
      lastContact?: string;
      active?: boolean;
      agentVersion?: string;
      allowMultiFactorAuthentication?: boolean;
      allowPublicKeyAuthentication?: boolean;
      allowSshPasswordAuthentication?: boolean;
      created?: string;
      modifySSHDConfig?: boolean;
      organization?: string;
      remoteIP?: string;
    }

    interface JumpCloudSystemsResponse {
      totalCount: number;
      results: JumpCloudSystem[];
    }

    interface JumpCloudUserSystemBinding {
      id: string;
      type: 'system';
    }

    const apiKey = credentials.api_key;
    const users: JumpCloudUser[] = [];

    try {
      // JumpCloud API v1 uses pagination with limit/skip
      const limit = 100;
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const url = new URL('https://console.jumpcloud.com/api/systemusers');
        url.searchParams.set('limit', String(limit));
        url.searchParams.set('skip', String(skip));
        url.searchParams.set('sort', 'email');

        const response = await fetch(url.toString(), {
          headers: {
            'x-api-key': apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new HttpException(
              'JumpCloud API key is invalid. Please reconnect.',
              HttpStatus.UNAUTHORIZED,
            );
          }
          const errorText = await response.text();
          this.logger.error(
            `JumpCloud API error: ${response.status} ${response.statusText} - ${errorText}`,
          );
          throw new HttpException(
            'Failed to fetch users from JumpCloud',
            HttpStatus.BAD_GATEWAY,
          );
        }

        const data: JumpCloudUsersResponse = await response.json();

        if (data.results && data.results.length > 0) {
          users.push(...data.results);
          skip += data.results.length;

          if (data.results.length < limit || skip >= data.totalCount) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error fetching JumpCloud users: ${error}`);
      throw new HttpException(
        'Failed to fetch users from JumpCloud',
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Fetch all systems from JumpCloud
    const systems: JumpCloudSystem[] = [];
    try {
      const sysLimit = 100;
      let sysSkip = 0;
      let sysHasMore = true;

      while (sysHasMore) {
        const sysUrl = new URL('https://console.jumpcloud.com/api/systems');
        sysUrl.searchParams.set('limit', String(sysLimit));
        sysUrl.searchParams.set('skip', String(sysSkip));

        const sysResponse = await fetch(sysUrl.toString(), {
          headers: {
            'x-api-key': apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (sysResponse.ok) {
          const sysData: JumpCloudSystemsResponse = await sysResponse.json();
          if (sysData.results && sysData.results.length > 0) {
            systems.push(...sysData.results);
            sysSkip += sysData.results.length;
            if (
              sysData.results.length < sysLimit ||
              sysSkip >= sysData.totalCount
            ) {
              sysHasMore = false;
            }
          } else {
            sysHasMore = false;
          }
        } else {
          this.logger.warn(
            'Failed to fetch JumpCloud systems, continuing without device info',
          );
          sysHasMore = false;
        }
      }
      this.logger.log(`Fetched ${systems.length} systems from JumpCloud`);
    } catch (error) {
      this.logger.warn(`Error fetching JumpCloud systems: ${error}`);
    }

    // Create a map of system ID to system details
    const systemsById = new Map(systems.map((s) => [s._id, s]));

    // Fetch user-to-system bindings for each user
    const userDevices = new Map<string, JumpCloudSystem[]>();

    for (const user of users) {
      try {
        const bindingsUrl = new URL(
          `https://console.jumpcloud.com/api/v2/users/${user._id}/systems`,
        );

        const bindingsResponse = await fetch(bindingsUrl.toString(), {
          headers: {
            'x-api-key': apiKey,
            Accept: 'application/json',
          },
        });

        if (bindingsResponse.ok) {
          const bindings: JumpCloudUserSystemBinding[] =
            await bindingsResponse.json();
          const userSystems = bindings
            .map((b) => systemsById.get(b.id))
            .filter((s): s is JumpCloudSystem => s !== undefined);
          if (userSystems.length > 0) {
            userDevices.set(user._id, userSystems);
          }
        }
      } catch {
        // Ignore binding fetch errors for individual users
      }
    }

    this.logger.log(`Found device bindings for ${userDevices.size} users`);

    // Helper to get full name
    const getFullName = (user: JumpCloudUser): string => {
      if (user.displayname) return user.displayname;
      const parts = [user.firstname, user.lastname].filter(Boolean);
      if (parts.length > 0) return parts.join(' ');
      return user.username;
    };

    // Filter to active users (exclude staged and suspended)
    const activeUsers = users.filter(
      (u) => u.state === 'ACTIVATED' && u.activated && !u.suspended,
    );
    const suspendedEmails = new Set(
      users
        .filter((u) => u.suspended || u.state === 'SUSPENDED')
        .map((u) => u.email.toLowerCase()),
    );
    const activeEmails = new Set(activeUsers.map((u) => u.email.toLowerCase()));

    this.logger.log(
      `Found ${activeUsers.length} active users and ${suspendedEmails.size} suspended users in JumpCloud`,
    );

    // Import users into the organization
    const results = {
      imported: 0,
      skipped: 0,
      deactivated: 0,
      reactivated: 0,
      errors: 0,
      totalDevices: systems.length,
      usersWithDevices: userDevices.size,
      details: [] as Array<{
        email: string;
        status:
          | 'imported'
          | 'skipped'
          | 'deactivated'
          | 'reactivated'
          | 'error';
        reason?: string;
        devices?: Array<{
          id: string;
          name: string;
          os: string;
          lastContact?: string;
        }>;
      }>,
    };

    // Helper to get devices for a user
    const getUserDeviceDetails = (userId: string) => {
      const devices = userDevices.get(userId);
      if (!devices || devices.length === 0) return undefined;
      return devices.map((d) => ({
        id: d._id,
        name: d.displayName || d.hostname || 'Unknown Device',
        os: d.os ? `${d.os} ${d.version || ''}`.trim() : 'Unknown OS',
        lastContact: d.lastContact,
      }));
    };

    for (const jcUser of activeUsers) {
      // Normalize email to lowercase for consistent database operations
      // This matches how we build suspendedEmails and activeEmails sets
      const normalizedEmail = jcUser.email.toLowerCase();

      try {
        // Check if user already exists
        const existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user
          const newUser = await db.user.create({
            data: {
              email: normalizedEmail,
              name: getFullName(jcUser),
              emailVerified: true,
            },
          });
          userId = newUser.id;
        }

        // Get device info for this user
        const deviceDetails = getUserDeviceDetails(jcUser._id);

        // Check if member already exists in this org
        const existingMember = await db.member.findFirst({
          where: {
            organizationId,
            userId,
          },
        });

        if (existingMember) {
          // If member was deactivated but is now active in JumpCloud, reactivate them
          if (existingMember.deactivated) {
            await db.member.update({
              where: { id: existingMember.id },
              data: { deactivated: false, isActive: true },
            });
            results.reactivated++;
            results.details.push({
              email: normalizedEmail,
              status: 'reactivated',
              reason: 'User is active again in JumpCloud',
              devices: deviceDetails,
            });
          } else {
            results.skipped++;
            results.details.push({
              email: normalizedEmail,
              status: 'skipped',
              reason: 'Already a member',
              devices: deviceDetails,
            });
          }
          continue;
        }

        // Create member - always as employee, admins can be promoted manually
        await db.member.create({
          data: {
            organizationId,
            userId,
            role: 'employee',
            isActive: true,
          },
        });

        results.imported++;
        results.details.push({
          email: normalizedEmail,
          status: 'imported',
          devices: deviceDetails,
        });
      } catch (error) {
        this.logger.error(`Error importing JumpCloud user: ${error}`);
        results.errors++;
        results.details.push({
          email: normalizedEmail,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
          devices: getUserDeviceDetails(jcUser._id),
        });
      }
    }

    // Deactivate members who are suspended OR deleted in JumpCloud
    const allOrgMembers = await db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
      },
      include: {
        user: true,
      },
    });

    // Get the domains from ALL users (including suspended) to track which domains JumpCloud manages
    // This ensures members get deactivated even when an entire domain has no active users
    const jcDomains = new Set(
      users.map((u) => u.email.split('@')[1]?.toLowerCase()),
    );

    for (const member of allOrgMembers) {
      const memberEmail = member.user.email.toLowerCase();
      const memberDomain = memberEmail.split('@')[1];

      // Only check members whose email domain matches the JumpCloud domain
      if (!memberDomain || !jcDomains.has(memberDomain)) {
        continue;
      }

      // If this member's email is suspended OR not in the active list, deactivate them
      const isSuspended = suspendedEmails.has(memberEmail);
      const isDeleted =
        !activeEmails.has(memberEmail) && !suspendedEmails.has(memberEmail);

      if (isSuspended || isDeleted) {
        try {
          await db.member.update({
            where: { id: member.id },
            data: { deactivated: true, isActive: false },
          });
          results.deactivated++;
          results.details.push({
            email: member.user.email,
            status: 'deactivated',
            reason: isSuspended
              ? 'User is suspended in JumpCloud'
              : 'User was removed from JumpCloud',
          });
        } catch (error) {
          this.logger.error(`Error deactivating member: ${error}`);
        }
      }
    }

    this.logger.log(
      `JumpCloud sync complete: ${results.imported} imported, ${results.reactivated} reactivated, ${results.deactivated} deactivated, ${results.skipped} skipped, ${results.errors} errors`,
    );

    return {
      success: true,
      totalFound: activeUsers.length,
      totalSuspended: suspendedEmails.size,
      ...results,
    };
  }

  /**
   * Check if JumpCloud is connected for an organization
   */
  @Post('jumpcloud/status')
  async getJumpCloudStatus(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionRepository.findBySlugAndOrg(
      'jumpcloud',
      organizationId,
    );

    if (!connection || connection.status !== 'active') {
      return {
        connected: false,
        connectionId: null,
        lastSyncAt: null,
        nextSyncAt: null,
      };
    }

    return {
      connected: true,
      connectionId: connection.id,
      lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: connection.nextSyncAt?.toISOString() ?? null,
    };
  }

  /**
   * Get the current employee sync provider for an organization
   */
  @Get('employee-sync-provider')
  async getEmployeeSyncProvider(
    @Query('organizationId') organizationId: string,
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { employeeSyncProvider: true },
    });

    if (!org) {
      throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
    }

    return {
      provider: org.employeeSyncProvider,
    };
  }

  /**
   * Set the employee sync provider for an organization
   */
  @Post('employee-sync-provider')
  async setEmployeeSyncProvider(
    @Query('organizationId') organizationId: string,
    @Body() body: { provider: string | null },
  ) {
    if (!organizationId) {
      throw new HttpException(
        'organizationId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { provider } = body;

    // Validate provider if set
    if (provider) {
      const validProviders = ['google-workspace', 'rippling', 'jumpcloud'];
      if (!validProviders.includes(provider)) {
        throw new HttpException(
          `Invalid provider. Must be one of: ${validProviders.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if the provider is actually connected
      const connection = await this.connectionRepository.findBySlugAndOrg(
        provider,
        organizationId,
      );

      if (!connection || connection.status !== 'active') {
        throw new HttpException(
          `Provider ${provider} is not connected`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    await db.organization.update({
      where: { id: organizationId },
      data: { employeeSyncProvider: provider },
    });

    this.logger.log(
      `Set employee sync provider to ${provider || 'none'} for org ${organizationId}`,
    );

    return {
      success: true,
      provider,
    };
  }
}

import {
  Controller,
  Post,
  Get,
  Query,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import {
  OrganizationId,
  AuthContext,
} from '../../auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '../../auth/types';
import { db } from '@db';
import { ConnectionRepository } from '../repositories/connection.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { OAuthCredentialsService } from '../services/oauth-credentials.service';
import {
  getManifest,
  type OAuthConfig,
  type RampUser,
  type RampUserStatus,
  type RampUsersResponse,
  type RoleMappingEntry,
} from '@trycompai/integration-platform';
import { RampRoleMappingService } from '../services/ramp-role-mapping.service';
import { IntegrationSyncLoggerService } from '../services/integration-sync-logger.service';
import { RampApiService } from '../services/ramp-api.service';

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

type GoogleWorkspaceSyncFilterMode = 'all' | 'exclude' | 'include';

const GOOGLE_WORKSPACE_SYNC_FILTER_MODES =
  new Set<GoogleWorkspaceSyncFilterMode>(['all', 'exclude', 'include']);

const parseSyncFilterTerms = (value: unknown): string[] => {
  const rawValues = Array.isArray(value)
    ? value.map((item) => String(item))
    : typeof value === 'string'
      ? [value]
      : [];

  return Array.from(
    new Set(
      rawValues
        .flatMap((item) => item.split(/[\n,;]+/))
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length > 0),
    ),
  );
};

const isFullEmailTerm = (term: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(term);

const matchesSyncFilterTerm = (email: string, term: string): boolean => {
  if (email === term) {
    return true;
  }

  if (term.startsWith('@')) {
    return email.endsWith(term);
  }

  if (isFullEmailTerm(term)) {
    return false;
  }

  if (term.includes('@')) {
    return email.includes(term);
  }

  return email.endsWith(`@${term}`) || email.includes(term);
};

const matchesSyncFilterTerms = (email: string, terms: string[]): boolean =>
  terms.some((term) => matchesSyncFilterTerm(email, term));

@Controller({ path: 'integrations/sync', version: '1' })
@ApiTags('Integrations')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly credentialVaultService: CredentialVaultService,
    private readonly oauthCredentialsService: OAuthCredentialsService,
    private readonly rampRoleMappingService: RampRoleMappingService,
    private readonly syncLoggerService: IntegrationSyncLoggerService,
    private readonly rampApiService: RampApiService,
  ) {}

  /**
   * Sync employees from Google Workspace
   */
  @Post('google-workspace/employees')
  @RequirePermission('integration', 'update')
  async syncGoogleWorkspaceEmployees(
    @OrganizationId() organizationId: string,
    @Query('connectionId') connectionId: string,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId is required',
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
            `Google API error: ${response.status} ${response.statusText} - ${errorText}`,
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

    const syncVariables = (connection.variables || {}) as Record<
      string,
      unknown
    >;
    const rawSyncFilterMode = syncVariables.sync_user_filter_mode;
    const syncFilterMode: GoogleWorkspaceSyncFilterMode =
      typeof rawSyncFilterMode === 'string' &&
      GOOGLE_WORKSPACE_SYNC_FILTER_MODES.has(
        rawSyncFilterMode as GoogleWorkspaceSyncFilterMode,
      )
        ? (rawSyncFilterMode as GoogleWorkspaceSyncFilterMode)
        : 'all';
    const excludedTerms = parseSyncFilterTerms(
      syncVariables.sync_excluded_emails,
    );
    const includedTerms = parseSyncFilterTerms(
      syncVariables.sync_included_emails,
    );

    let effectiveSyncFilterMode = syncFilterMode;
    if (syncFilterMode === 'include' && includedTerms.length === 0) {
      this.logger.warn(
        `Google Workspace sync for org ${organizationId} is set to include mode, but include list is empty. Falling back to all users.`,
      );
      effectiveSyncFilterMode = 'all';
    }

    const filteredUsers = users.filter((user) => {
      const email = user.primaryEmail.toLowerCase();

      if (effectiveSyncFilterMode === 'exclude' && excludedTerms.length > 0) {
        return !matchesSyncFilterTerms(email, excludedTerms);
      }

      if (effectiveSyncFilterMode === 'include') {
        return matchesSyncFilterTerms(email, includedTerms);
      }

      return true;
    });

    this.logger.log(
      `Google Workspace sync filter mode "${effectiveSyncFilterMode}" kept ${filteredUsers.length}/${users.length} users`,
    );

    // Active users to import/reactivate are based on the selected filter mode
    const activeUsers = filteredUsers.filter((u) => !u.suspended);
    const filteredSuspendedEmails = new Set(
      filteredUsers
        .filter((u) => u.suspended)
        .map((u) => u.primaryEmail.toLowerCase()),
    );
    const filteredActiveEmails = new Set(
      activeUsers.map((u) => u.primaryEmail.toLowerCase()),
    );
    const allSuspendedEmails = new Set(
      users.filter((u) => u.suspended).map((u) => u.primaryEmail.toLowerCase()),
    );
    const allActiveEmails = new Set(
      users
        .filter((u) => !u.suspended)
        .map((u) => u.primaryEmail.toLowerCase()),
    );

    this.logger.log(
      `Found ${activeUsers.length} active users and ${filteredSuspendedEmails.size} suspended users in Google Workspace after sync filtering`,
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
        rampStatus?: RampUserStatus | 'USER_MISSING';
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

    const deactivationGwDomains =
      effectiveSyncFilterMode === 'include'
        ? new Set(users.map((u) => u.primaryEmail.split('@')[1]?.toLowerCase()))
        : new Set(
            filteredUsers.map((u) =>
              u.primaryEmail.split('@')[1]?.toLowerCase(),
            ),
          );
    const deactivationSuspendedEmails =
      effectiveSyncFilterMode === 'include'
        ? allSuspendedEmails
        : filteredSuspendedEmails;
    const deactivationActiveEmails =
      effectiveSyncFilterMode === 'include'
        ? allActiveEmails
        : filteredActiveEmails;

    for (const member of allOrgMembers) {
      const memberEmail = member.user.email.toLowerCase();
      const memberDomain = memberEmail.split('@')[1];
      const memberRoles = member.role
        .split(',')
        .map((role) => role.trim().toLowerCase());

      // Only check members whose email domain matches the Google Workspace domain
      if (!memberDomain || !deactivationGwDomains.has(memberDomain)) {
        continue;
      }

      // Safety guard: never auto-deactivate privileged members via sync.
      if (
        memberRoles.includes('owner') ||
        memberRoles.includes('admin') ||
        memberRoles.includes('auditor')
      ) {
        continue;
      }

      // In exclude mode we keep excluded users unchanged and only stop syncing them.
      if (
        effectiveSyncFilterMode === 'exclude' &&
        excludedTerms.length > 0 &&
        matchesSyncFilterTerms(memberEmail, excludedTerms)
      ) {
        continue;
      }

      // If this member's email is suspended OR not in the active list, deactivate them
      const isSuspended = deactivationSuspendedEmails.has(memberEmail);
      const isDeleted =
        !deactivationActiveEmails.has(memberEmail) &&
        !deactivationSuspendedEmails.has(memberEmail);

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
      totalSuspended: filteredSuspendedEmails.size,
      ...results,
    };
  }

  /**
   * Check if Google Workspace is connected for an organization
   */
  @Post('google-workspace/status')
  @RequirePermission('integration', 'read')
  async getGoogleWorkspaceStatus(
    @OrganizationId() organizationId: string,
  ) {

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
  @RequirePermission('integration', 'update')
  async syncRipplingEmployees(
    @OrganizationId() organizationId: string,
    @Query('connectionId') connectionId: string,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId is required',
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
        rampStatus?: RampUserStatus | 'USER_MISSING';
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
  @RequirePermission('integration', 'read')
  async getRipplingStatus(@OrganizationId() organizationId: string) {

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
   * Sync employees from Ramp
   */
  @Post('ramp/employees')
  @RequirePermission('integration', 'update')
  async syncRampEmployees(
    @OrganizationId() organizationId: string,
    @Query('connectionId') connectionId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    if (connection.organizationId !== organizationId) {
      throw new HttpException('Connection not found', HttpStatus.NOT_FOUND);
    }

    const provider = await db.integrationProvider.findUnique({
      where: { id: connection.providerId },
    });

    if (!provider || provider.slug !== 'ramp') {
      throw new HttpException(
        'This endpoint only supports Ramp connections',
        HttpStatus.BAD_REQUEST,
      );
    }

    const triggeredBy =
      authContext.authType === 'service'
        ? 'scheduled'
        : authContext.authType === 'api-key'
          ? 'api'
          : 'manual';

    const logId = await this.syncLoggerService.startLog({
      connectionId,
      organizationId,
      provider: 'ramp',
      eventType: 'employee_sync',
      triggeredBy,
      userId: authContext.userId ?? undefined,
    });

    try {
      return await this.syncRampEmployeesInner(
        organizationId,
        connectionId,
        authContext,
        connection,
        logId,
      );
    } catch (error) {
      await this.syncLoggerService.failLog(
        logId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  private async syncRampEmployeesInner(
    organizationId: string,
    connectionId: string,
    authContext: AuthContextType,
    connection: { variables: unknown },
    logId: string,
  ) {
    const accessToken = await this.rampApiService.getAccessToken(connectionId, organizationId);

    const baseUsers = await this.rampApiService.fetchUsers(accessToken);
    const suspendedUsers = await this.rampApiService.fetchUsers(accessToken, 'USER_SUSPENDED');
    const users = [...baseUsers, ...suspendedUsers];

    // Filter out non-syncable statuses (pending invites, onboarding, expired)
    const syncableStatuses = new Set<RampUserStatus>([
      'USER_ACTIVE',
      'USER_INACTIVE',
      'USER_SUSPENDED',
    ]);
    const skippedStatuses = users.filter(
      (u) => u.status && !syncableStatuses.has(u.status),
    );
    if (skippedStatuses.length > 0) {
      this.logger.log(
        `Skipping ${skippedStatuses.length} Ramp users with non-syncable statuses (INVITE_PENDING, INVITE_EXPIRED, USER_ONBOARDING)`,
      );
    }

    const activeUsers = users.filter((u) => u.status === 'USER_ACTIVE');
    const inactiveUsers = users.filter((u) => u.status === 'USER_INACTIVE');

    const activeEmails = new Set(
      activeUsers
        .map((u) => u.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    );
    const inactiveEmails = new Set(
      inactiveUsers
        .map((u) => u.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    );
    const suspendedEmails = new Set(
      suspendedUsers
        .map((u) => u.email?.toLowerCase())
        .filter((email): email is string => Boolean(email)),
    );

    this.logger.log(
      `Found ${activeUsers.length} active, ${inactiveUsers.length} inactive, and ${suspendedUsers.length} suspended Ramp users`,
    );

    // Load role mapping from connection variables
    const connectionVars = (connection.variables ?? {}) as Record<
      string,
      unknown
    >;
    let roleMapping = Array.isArray(connectionVars.role_mapping)
      ? (connectionVars.role_mapping as RoleMappingEntry[])
      : null;

    if (!roleMapping) {
      const isAutomatedSync = authContext.authType === 'service';

      if (!isAutomatedSync) {
        // Manual sync — prompt user to configure mapping via UI
        await this.syncLoggerService.completeLog(logId, {
          requiresRoleMapping: true,
          message: 'Role mapping is not configured',
        });
        return {
          success: false,
          requiresRoleMapping: true,
          message:
            'Role mapping is not configured. Please configure role mapping before syncing.',
        };
      }

      // Automated sync (cron) — auto-generate default mapping
      const allRampRolesForDefault = [
        ...new Set(
          activeUsers
            .map((u) => u.role)
            .filter((r): r is string => Boolean(r)),
        ),
      ];

      if (allRampRolesForDefault.length === 0) {
        this.logger.warn(
          'No Ramp roles found to auto-generate mapping',
        );
        const emptyResult = {
          totalFound: 0,
          imported: 0,
          skipped: 0,
          deactivated: 0,
          reactivated: 0,
          errors: 0,
          details: [],
        };
        await this.syncLoggerService.completeLog(logId, emptyResult);
        return { success: true, ...emptyResult };
      }

      const defaultEntries =
        this.rampRoleMappingService.getDefaultMapping(
          allRampRolesForDefault,
        );

      await this.rampRoleMappingService.ensureCustomRolesExist(
        organizationId,
        defaultEntries,
      );
      await this.rampRoleMappingService.saveMapping(
        connectionId,
        defaultEntries,
      );

      roleMapping = defaultEntries;

      this.logger.log(
        `Auto-generated default role mapping for Ramp sync (${defaultEntries.length} roles)`,
      );
    }

    // Discover all Ramp roles in this batch and auto-create mappings for unknown ones
    const allRampRoles = new Set(
      activeUsers
        .map((u) => u.role)
        .filter((r): r is string => Boolean(r)),
    );
    const mappedRoles = new Set(roleMapping.map((m) => m.rampRole));
    const newRoles = [...allRampRoles].filter((r) => !mappedRoles.has(r));

    if (newRoles.length > 0) {
      this.logger.log(
        `Found ${newRoles.length} new Ramp roles not in mapping: ${newRoles.join(', ')}`,
      );

      const newEntries =
        this.rampRoleMappingService.getDefaultMapping(newRoles);

      // Create custom roles in DB for new entries
      await this.rampRoleMappingService.ensureCustomRolesExist(
        organizationId,
        newEntries,
      );

      // Add to mapping and save
      const updatedMapping = [...roleMapping, ...newEntries];
      await this.rampRoleMappingService.saveMapping(
        connectionId,
        updatedMapping,
      );

      // Use the updated mapping
      roleMapping.push(...newEntries);
    }

    const roleMappingLookup = new Map(
      roleMapping.map((m) => [m.rampRole, m.compRole]),
    );

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      deactivated: 0,
      reactivated: 0,
      errors: 0,
      details: [] as Array<{
        email: string;
        status:
          | 'imported'
          | 'updated'
          | 'skipped'
          | 'deactivated'
          | 'reactivated'
          | 'error';
        reason?: string;
        rampStatus?: RampUserStatus | 'USER_MISSING';
      }>,
    };

    for (const rampUser of activeUsers) {
      const normalizedEmail = rampUser.email?.toLowerCase();
      if (!normalizedEmail) {
        continue;
      }

      try {
        // Try external ID match first (handles email changes)
        let existingMember = rampUser.id
          ? await db.member.findFirst({
              where: {
                organizationId,
                externalUserId: rampUser.id,
                externalUserSource: 'ramp',
              },
            })
          : null;

        // Fall back to email match
        if (!existingMember) {
          const existingUser = await db.user.findUnique({
            where: { email: normalizedEmail },
          });
          if (existingUser) {
            existingMember = await db.member.findFirst({
              where: { organizationId, userId: existingUser.id },
            });
          }
        }

        if (existingMember) {
          const mappedRole =
            roleMappingLookup.get(rampUser.role ?? '') ?? 'employee';

          // Build update data: backfill external ID + update role if changed
          const updateData: Record<string, unknown> = {};

          if (
            rampUser.id &&
            (!existingMember.externalUserId ||
              existingMember.externalUserSource !== 'ramp')
          ) {
            updateData.externalUserId = rampUser.id;
            updateData.externalUserSource = 'ramp';
          }

          // Update role if it changed (but don't downgrade privileged roles)
          const currentRoles = existingMember.role
            .split(',')
            .map((r) => r.trim().toLowerCase());
          const isPrivileged =
            currentRoles.includes('owner') ||
            currentRoles.includes('admin') ||
            currentRoles.includes('auditor');

          if (!isPrivileged && existingMember.role !== mappedRole) {
            updateData.role = mappedRole;
          }

          if (existingMember.deactivated) {
            updateData.deactivated = false;
            updateData.isActive = true;

            await db.member.update({
              where: { id: existingMember.id },
              data: updateData,
            });
            results.reactivated++;
            results.details.push({
              email: normalizedEmail,
              status: 'reactivated',
              reason: 'User is active again in Ramp',
            });
          } else if (Object.keys(updateData).length > 0) {
            await db.member.update({
              where: { id: existingMember.id },
              data: updateData,
            });
            if (updateData.role) {
              results.updated++;
              results.details.push({
                email: normalizedEmail,
                status: 'updated',
                reason: `Role updated to ${mappedRole}`,
              });
            } else {
              results.skipped++;
              results.details.push({
                email: normalizedEmail,
                status: 'skipped',
                reason: 'Already a member (external ID backfilled)',
              });
            }
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

        // Create new user if needed
        let existingUser = await db.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!existingUser) {
          const displayName =
            `${rampUser.first_name ?? ''} ${rampUser.last_name ?? ''}`.trim() ||
            normalizedEmail.split('@')[0];

          existingUser = await db.user.create({
            data: {
              email: normalizedEmail,
              name: displayName,
              emailVerified: true,
            },
          });
        }

        const mappedRole =
          roleMappingLookup.get(rampUser.role ?? '') ?? 'employee';

        await db.member.create({
          data: {
            organizationId,
            userId: existingUser.id,
            role: mappedRole,
            isActive: true,
            externalUserId: rampUser.id || null,
            externalUserSource: rampUser.id ? 'ramp' : null,
          },
        });

        results.imported++;
        results.details.push({
          email: normalizedEmail,
          status: 'imported',
        });
      } catch (error) {
        this.logger.error(`Error importing Ramp user: ${error}`);
        results.errors++;
        results.details.push({
          email: normalizedEmail,
          status: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const allOrgMembers = await db.member.findMany({
      where: {
        organizationId,
        deactivated: false,
      },
      include: {
        user: true,
      },
    });

    const rampDomains = new Set(
      users
        .map((u) => u.email?.split('@')[1]?.toLowerCase())
        .filter((domain): domain is string => Boolean(domain)),
    );

    for (const member of allOrgMembers) {
      const memberEmail = member.user.email.toLowerCase();
      const memberDomain = memberEmail.split('@')[1];

      if (!memberDomain || !rampDomains.has(memberDomain)) {
        continue;
      }

      // Safety guard: never auto-deactivate privileged members via sync
      const memberRoles = member.role
        .split(',')
        .map((r) => r.trim().toLowerCase());
      if (
        memberRoles.includes('owner') ||
        memberRoles.includes('admin') ||
        memberRoles.includes('auditor')
      ) {
        continue;
      }

      const isSuspended = suspendedEmails.has(memberEmail);
      const isInactive = inactiveEmails.has(memberEmail);
      const isRemoved =
        !activeEmails.has(memberEmail) && !isSuspended && !isInactive;
      const rampStatus: RampUserStatus | 'USER_MISSING' = isSuspended
        ? 'USER_SUSPENDED'
        : isInactive
          ? 'USER_INACTIVE'
          : isRemoved
            ? 'USER_MISSING'
            : 'USER_ACTIVE';

      if (isSuspended || isInactive || isRemoved) {
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
              ? 'User is suspended in Ramp'
              : isInactive
                ? 'User is inactive in Ramp'
                : 'User was removed from Ramp',
            rampStatus,
          });
          this.logger.log(
            `Ramp deactivated member ${member.user.email} (${rampStatus})`,
          );
        } catch (error) {
          this.logger.error(`Error deactivating member: ${error}`);
          results.errors++;
          results.details.push({
            email: memberEmail,
            status: 'error',
            reason: `Failed to deactivate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }
    }

    this.logger.log(
      `Ramp sync complete: ${results.imported} imported, ${results.updated} updated, ${results.reactivated} reactivated, ${results.deactivated} deactivated, ${results.skipped} skipped, ${results.errors} errors`,
    );

    // Update lastSyncAt on the connection
    await db.integrationConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    const syncResult = {
      success: true,
      totalFound: activeUsers.length,
      totalInactive: inactiveUsers.length,
      totalSuspended: suspendedUsers.length,
      ...results,
    };

    await this.syncLoggerService.completeLog(logId, {
      imported: results.imported,
      updated: results.updated,
      deactivated: results.deactivated,
      reactivated: results.reactivated,
      skipped: results.skipped,
      errors: results.errors,
      totalFound: activeUsers.length,
      details: results.details,
    });

    return syncResult;
  }

  /**
   * Sync employees from JumpCloud
   */
  @Post('jumpcloud/employees')
  @RequirePermission('integration', 'update')
  async syncJumpCloudEmployees(
    @OrganizationId() organizationId: string,
    @Query('connectionId') connectionId: string,
  ) {
    if (!connectionId) {
      throw new HttpException(
        'connectionId is required',
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

    const apiKey = Array.isArray(credentials.api_key)
      ? credentials.api_key[0]
      : credentials.api_key;
    if (!apiKey) {
      throw new HttpException('API key not found', HttpStatus.BAD_REQUEST);
    }
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

    const syncVariables = (connection.variables || {}) as Record<
      string,
      unknown
    >;
    const excludedTerms = parseSyncFilterTerms(
      syncVariables.sync_excluded_emails,
    );
    const filteredUsers =
      excludedTerms.length === 0
        ? users
        : users.filter(
            (user) =>
              !matchesSyncFilterTerms(user.email.toLowerCase(), excludedTerms),
          );

    this.logger.log(
      `JumpCloud sync excluded filter kept ${filteredUsers.length}/${users.length} users`,
    );

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

    for (const user of filteredUsers) {
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
    const allActiveUsers = users.filter(
      (u) => u.state === 'ACTIVATED' && u.activated && !u.suspended,
    );
    const activeUsers =
      excludedTerms.length === 0
        ? allActiveUsers
        : allActiveUsers.filter(
            (user) =>
              !matchesSyncFilterTerms(user.email.toLowerCase(), excludedTerms),
          );
    const suspendedEmails = new Set(
      users
        .filter((u) => u.suspended || u.state === 'SUSPENDED')
        .map((u) => u.email.toLowerCase()),
    );
    const activeEmails = new Set(
      allActiveUsers.map((u) => u.email.toLowerCase()),
    );

    this.logger.log(
      `Found ${activeUsers.length} active users to sync (${allActiveUsers.length} total active before exclusions) and ${suspendedEmails.size} suspended users in JumpCloud`,
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
      const memberRoles = member.role
        .split(',')
        .map((role) => role.trim().toLowerCase());

      // Only check members whose email domain matches the JumpCloud domain
      if (!memberDomain || !jcDomains.has(memberDomain)) {
        continue;
      }

      // Safety guard: never auto-deactivate privileged members via sync.
      // This prevents org lockouts when identity data is partial/misaligned.
      if (
        memberRoles.includes('owner') ||
        memberRoles.includes('admin') ||
        memberRoles.includes('auditor')
      ) {
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
  @RequirePermission('integration', 'read')
  async getJumpCloudStatus(@OrganizationId() organizationId: string) {

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
   * Check if Ramp is connected for an organization
   */
  @Post('ramp/status')
  @RequirePermission('integration', 'read')
  async getRampStatus(@OrganizationId() organizationId: string) {

    const connection = await this.connectionRepository.findBySlugAndOrg(
      'ramp',
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
  @RequirePermission('integration', 'read')
  async getEmployeeSyncProvider(
    @OrganizationId() organizationId: string,
  ) {

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
  @RequirePermission('integration', 'update')
  async setEmployeeSyncProvider(
    @OrganizationId() organizationId: string,
    @Body() body: { provider: string | null },
  ) {

    const { provider } = body;

    // Validate provider if set
    if (provider) {
      const validProviders = [
        'google-workspace',
        'rippling',
        'jumpcloud',
        'ramp',
      ];
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

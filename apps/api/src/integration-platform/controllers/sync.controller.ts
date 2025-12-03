import {
  Controller,
  Post,
  Query,
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
      const oauthConfig = manifest.auth.config as OAuthConfig;
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
          this.logger.error(`Google API error: ${errorText}`);
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
      try {
        // Check if user already exists
        const existingUser = await db.user.findUnique({
          where: { email: gwUser.primaryEmail },
        });

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
        } else {
          // Create new user
          const newUser = await db.user.create({
            data: {
              email: gwUser.primaryEmail,
              name: gwUser.name.fullName || gwUser.primaryEmail.split('@')[0],
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
              email: gwUser.primaryEmail,
              status: 'reactivated',
              reason: 'User is active again in Google Workspace',
            });
          } else {
            results.skipped++;
            results.details.push({
              email: gwUser.primaryEmail,
              status: 'skipped',
              reason: 'Already a member',
            });
          }
          continue;
        }

        // Create member
        await db.member.create({
          data: {
            organizationId,
            userId,
            role: gwUser.isAdmin ? 'admin' : 'employee',
            isActive: true,
          },
        });

        results.imported++;
        results.details.push({
          email: gwUser.primaryEmail,
          status: 'imported',
        });
      } catch (error) {
        this.logger.error(
          `Error importing user ${gwUser.primaryEmail}: ${error}`,
        );
        results.errors++;
        results.details.push({
          email: gwUser.primaryEmail,
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

    // Get the domain from active users to only check members with matching domain
    const gwDomains = new Set(
      activeUsers.map((u) => u.primaryEmail.split('@')[1]?.toLowerCase()),
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
          this.logger.error(
            `Error deactivating member ${member.user.email}: ${error}`,
          );
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
      };
    }

    return {
      connected: true,
      connectionId: connection.id,
    };
  }
}

import { MagicLinkEmail, OTPVerificationEmail } from '@trycompai/email';
import { triggerEmail } from '../email/trigger-email';
import { InviteEmail } from '../email/templates/invite-member';
import { db } from '@trycompai/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import {
  bearer,
  emailOTP,
  magicLink,
  multiSession,
  organization,
} from 'better-auth/plugins';
import { ac, allRoles } from '@comp/auth';

const MAGIC_LINK_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/**
 * Determine the cookie domain based on environment.
 */
function getCookieDomain(): string | undefined {
  const baseUrl =
    process.env.BASE_URL || '';

  if (baseUrl.includes('staging.trycomp.ai')) {
    return '.staging.trycomp.ai';
  }
  if (baseUrl.includes('trycomp.ai')) {
    return '.trycomp.ai';
  }
  return undefined;
}

/**
 * Get trusted origins for CORS/auth
 */
function getTrustedOrigins(): string[] {
  const origins = process.env.AUTH_TRUSTED_ORIGINS;
  if (origins) {
    return origins.split(',').map((o) => o.trim());
  }

  return [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3333',
    'https://app.trycomp.ai',
    'https://portal.trycomp.ai',
    'https://api.trycomp.ai',
    'https://app.staging.trycomp.ai',
    'https://portal.staging.trycomp.ai',
    'https://api.staging.trycomp.ai',
    'https://dev.trycomp.ai',
  ];
}

// Build social providers config
const socialProviders: Record<string, unknown> = {};

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  socialProviders.google = {
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  };
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  socialProviders.github = {
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
  };
}

if (
  process.env.AUTH_MICROSOFT_CLIENT_ID &&
  process.env.AUTH_MICROSOFT_CLIENT_SECRET
) {
  socialProviders.microsoft = {
    clientId: process.env.AUTH_MICROSOFT_CLIENT_ID,
    clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET,
    tenantId: 'common',
    prompt: 'select_account',
  };
}

const cookieDomain = getCookieDomain();

// =============================================================================
// Security Validation
// =============================================================================

/**
 * Validate required environment variables at startup.
 * Throws an error if critical security configuration is missing.
 */
function validateSecurityConfig(): void {
  if (!process.env.SECRET_KEY) {
    throw new Error(
      'SECURITY ERROR: SECRET_KEY environment variable is required. ' +
        'Generate a secure secret with: openssl rand -base64 32',
    );
  }

  if (process.env.SECRET_KEY.length < 16) {
    throw new Error(
      'SECURITY ERROR: SECRET_KEY must be at least 16 characters long for security.',
    );
  }

  // Warn about development defaults in production
  if (process.env.NODE_ENV === 'production') {
    const baseUrl =
      process.env.BASE_URL || '';
    if (baseUrl.includes('localhost')) {
      console.warn(
        'SECURITY WARNING: BASE_URL contains "localhost" in production. ' +
          'This may cause issues with OAuth callbacks and cookies.',
      );
    }
  }
}

// Run validation at module load time
validateSecurityConfig();

/**
 * The auth server instance - single source of truth for authentication.
 *
 * BASE_URL must point to the API (e.g., https://api.trycomp.ai).
 * OAuth callbacks go directly to the API. Clients send absolute callbackURLs
 * so better-auth redirects to the correct app after processing.
 * Cross-subdomain cookies (.trycomp.ai) ensure the session works on all apps.
 */
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  // baseURL must point to the API (e.g., https://api.trycomp.ai) so that
  // OAuth callbacks go directly to the API regardless of which frontend
  // initiated the flow. Clients must send absolute callbackURLs so that
  // after OAuth processing, better-auth redirects to the correct app.
  // Cross-subdomain cookies (.trycomp.ai) ensure the session works everywhere.
  baseURL: process.env.BASE_URL || 'http://localhost:3333',
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: false,
    },
    ...(cookieDomain && {
      crossSubDomainCookies: {
        enabled: true,
        domain: cookieDomain,
      },
      defaultCookieAttributes: {
        sameSite: 'lax' as const,
        secure: true,
      },
    }),
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) {
            console.log(
              '[Better Auth] Session creation hook called for user:',
              session.userId,
            );
          }
          try {
            const userOrganization = await db.organization.findFirst({
              where: {
                members: {
                  some: {
                    userId: session.userId,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                name: true,
              },
            });

            if (userOrganization) {
              if (isDev) {
                console.log(
                  `[Better Auth] Setting activeOrganizationId to ${userOrganization.id} (${userOrganization.name}) for user ${session.userId}`,
                );
              }
              return {
                data: {
                  ...session,
                  activeOrganizationId: userOrganization.id,
                },
              };
            } else {
              if (isDev) {
                console.log(
                  `[Better Auth] No organization found for user ${session.userId}`,
                );
              }
              return {
                data: session,
              };
            }
          } catch (error) {
            // Always log errors, even in production
            console.error('[Better Auth] Session creation hook error:', error);
            return {
              data: session,
            };
          }
        },
      },
    },
  },
  // SECRET_KEY is validated at startup via validateSecurityConfig()
  secret: process.env.SECRET_KEY as string,
  plugins: [
    organization({
      membershipLimit: 100000000000,
      async sendInvitationEmail(data) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Sending invitation to:', data.email);
        }
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ??
          process.env.BETTER_AUTH_URL ??
          'https://app.trycomp.ai';
        const inviteLink = `${appUrl}/invite/${data.invitation.id}`;
        await triggerEmail({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name} on Comp AI`,
          react: InviteEmail({
            organizationName: data.organization.name,
            inviteLink,
            email: data.email,
          }),
        });
      },
      ac,
      roles: allRoles,
      // Enable dynamic access control for custom roles
      // This allows organizations to create custom roles at runtime
      // Roles are stored in better-auth's internal tables
      dynamicAccessControl: {
        enabled: true,
        // Limit custom roles per organization to prevent abuse
        maximumRolesPerOrganization: 100,
      },
      schema: {
        organization: {
          modelName: 'Organization',
        },
        // Custom roles table for dynamic access control
        organizationRole: {
          modelName: 'OrganizationRole',
          fields: {
            role: 'name',
            permission: 'permissions',
          },
        },
      },
    }),
    magicLink({
      expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
      sendMagicLink: async ({ email, url }) => {
        // The `url` from better-auth points to the API's verify endpoint
        // and includes the callbackURL from the client's sign-in request.
        // Flow: user clicks link → API verifies token & sets session cookie
        // → API redirects (302) to callbackURL (the app).
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Sending magic link to:', email);
          console.log('[Auth] Magic link URL:', url);
        }
        await triggerEmail({
          to: email,
          subject: 'Login to Comp AI',
          react: MagicLinkEmail({ email, url }),
        });
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp }) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Sending OTP to:', email);
        }
        await triggerEmail({
          to: email,
          subject: 'One-Time Password for Comp AI',
          react: OTPVerificationEmail({ email, otp }),
        });
      },
    }),
    multiSession(),
    bearer(),
  ],
  socialProviders,
  user: {
    modelName: 'User',
  },
  organization: {
    modelName: 'Organization',
  },
  member: {
    modelName: 'Member',
  },
  invitation: {
    modelName: 'Invitation',
  },
  session: {
    modelName: 'Session',
  },
  account: {
    modelName: 'Account',
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github', 'microsoft'],
    },
    // Skip the state cookie CSRF check for OAuth flows.
    // In our cross-origin setup (app/portal → API), the state cookie may not
    // survive the OAuth redirect flow. The OAuth state parameter stored in the
    // database already provides CSRF protection (random 32-char string validated
    // against the DB). This is the same approach better-auth's oAuthProxy plugin uses.
    skipStateCookieCheck: true,
  },
  verification: {
    modelName: 'Verification',
  },
});

export type Auth = typeof auth;

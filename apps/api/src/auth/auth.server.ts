import '../config/load-env';
import { MagicLinkEmail, OTPVerificationEmail } from '@trycompai/email';
import { triggerEmail } from '../email/trigger-email';
import { InviteEmail } from '../email/templates/invite-member';
import { db } from '@db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import {
  admin,
  bearer,
  emailOTP,
  magicLink,
  multiSession,
  organization,
} from 'better-auth/plugins';
import { ac, allRoles } from '@trycompai/auth';
import { createAuthMiddleware } from 'better-auth/api';
import { Redis } from '@upstash/redis';
import type { AccessControl } from 'better-auth/plugins/access';

const MAGIC_LINK_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/**
 * Determine the cookie domain based on environment.
 */
function getCookieDomain(): string | undefined {
  const baseUrl = process.env.BASE_URL || '';

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
export function getTrustedOrigins(): string[] {
  const origins = process.env.AUTH_TRUSTED_ORIGINS;
  if (origins) {
    return origins.split(',').map((o) => o.trim());
  }

  return [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3333',
    'http://localhost:3004',
    'http://localhost:3008',
    'https://app.trycomp.ai',
    'https://portal.trycomp.ai',
    'https://api.trycomp.ai',
    'https://app.staging.trycomp.ai',
    'https://portal.staging.trycomp.ai',
    'https://api.staging.trycomp.ai',
    'https://dev.trycomp.ai',
    'https://framework-editor.trycomp.ai',
  ];
}

/**
 * Check if an origin matches a known trusted pattern (static list + subdomains).
 * This is a fast synchronous check that doesn't hit the DB.
 */
export function isStaticTrustedOrigin(origin: string): boolean {
  const trustedOrigins = getTrustedOrigins();
  if (trustedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      url.hostname.endsWith('.trycomp.ai') ||
      url.hostname.endsWith('.staging.trycomp.ai') ||
      url.hostname.endsWith('.trust.inc') ||
      url.hostname === 'trust.inc'
    );
  } catch {
    return false;
  }
}

// ── Custom domain lookup via Redis cache ─────────────────────────────────────

const CORS_DOMAINS_CACHE_KEY = 'cors:custom-domains';
const CORS_DOMAINS_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

const corsRedisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function getCustomDomains(): Promise<Set<string>> {
  // Try Redis cache first (non-fatal if Redis is unavailable)
  try {
    const cached = await corsRedisClient.get<string[]>(CORS_DOMAINS_CACHE_KEY);
    if (cached) {
      return new Set(cached);
    }
  } catch (error) {
    console.error('[CORS] Redis cache read failed, falling back to DB:', error);
  }

  // Cache miss or Redis unavailable — query DB
  try {
    const trusts = await db.trust.findMany({
      where: {
        domain: { not: null },
        status: 'published',
      },
      select: { domain: true },
    });

    const domains = trusts
      .map((t) => t.domain)
      .filter((d): d is string => d !== null);

    // Best-effort cache update (don't lose DB results if Redis SET fails)
    try {
      await corsRedisClient.set(CORS_DOMAINS_CACHE_KEY, domains, {
        ex: CORS_DOMAINS_CACHE_TTL_SECONDS,
      });
    } catch {
      // Redis unavailable — continue without caching
    }

    return new Set(domains);
  } catch (error) {
    console.error('[CORS] Failed to fetch custom domains from DB:', error);
    return new Set();
  }
}

/**
 * Check if an origin is trusted. Checks (in order):
 * 1. Static trusted origins list
 * 2. *.trycomp.ai / *.trust.inc subdomains
 * 3. Published custom domains from the DB (cached in Redis, TTL 5 min)
 */
export async function isTrustedOrigin(origin: string): Promise<boolean> {
  if (isStaticTrustedOrigin(origin)) {
    return true;
  }

  // Check verified custom domains from DB via Redis cache
  try {
    const url = new URL(origin);
    const customDomains = await getCustomDomains();
    return customDomains.has(url.hostname);
  } catch {
    return false;
  }
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
    tenantId: process.env.AUTH_MICROSOFT_TENANT_ID || 'common',
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
    const baseUrl = process.env.BASE_URL || '';
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
    // Prevent cookie collisions between environments.
    // Production keeps the default 'better-auth' prefix (unchanged).
    ...(cookieDomain === '.staging.trycomp.ai' && {
      cookiePrefix: 'staging',
    }),
    ...(!cookieDomain && {
      cookiePrefix: 'local',
    }),
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
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith('/admin/')) return;

      const session = ctx.context?.session;
      const userId = session?.user?.id;
      if (!userId) return;

      const descriptions: Record<string, string> = {
        '/admin/impersonate-user': 'Impersonated a user',
        '/admin/stop-impersonating': 'Stopped impersonating a user',
        '/admin/ban-user': 'Banned a user',
        '/admin/unban-user': 'Unbanned a user',
        '/admin/set-role': 'Changed a user role',
        '/admin/set-user-password': 'Reset a user password',
        '/admin/create-user': 'Created a user',
        '/admin/update-user': 'Updated a user',
        '/admin/remove-user': 'Removed a user',
        '/admin/revoke-user-session': 'Revoked a user session',
        '/admin/revoke-user-sessions': 'Revoked all user sessions',
      };

      const description = descriptions[ctx.path];
      if (!description) return;

      try {
        let organizationId = (session.session as Record<string, unknown>)
          ?.activeOrganizationId as string | undefined;

        if (!organizationId) {
          const userOrg = await db.organization.findFirst({
            where: { members: { some: { userId } } },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          });

          if (!userOrg) {
            console.error(
              '[Auth] SECURITY: Admin action blocked — no organization could be resolved for admin user',
              { userId, path: ctx.path },
            );
            throw new Error(
              'Admin action blocked: unable to resolve organization for audit trail',
            );
          }

          organizationId = userOrg.id;
        }

        await db.auditLog.create({
          data: {
            userId,
            memberId: null,
            organizationId,
            entityType: null,
            entityId: null,
            description: `[Platform Admin] ${description}`,
            data: {
              action: description,
              method: 'POST',
              path: ctx.path,
              resource: 'admin',
              permission: 'platform-admin',
            },
          },
        });
      } catch (err) {
        console.error('[Auth] Failed to write admin audit log:', err);
      }
    }),
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
      ac: ac as AccessControl,
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
    admin({
      defaultRole: 'user',
    }),
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

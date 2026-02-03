import {
  MagicLinkEmail,
  OTPVerificationEmail,
  sendInviteMemberEmail,
  sendEmail,
} from '@trycompai/email';
import { db } from '@trycompai/db';
import { symmetricDecrypt } from 'better-auth/crypto';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import {
  bearer,
  emailOTP,
  jwt,
  magicLink,
  multiSession,
  organization,
} from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import {
  defaultStatements,
  adminAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

// ============================================================================
// Permissions (inlined from @comp/auth to avoid cross-package TS compilation)
// ============================================================================

const statement = {
  ...defaultStatements,
  organization: ['read', 'update', 'delete'],
  control: ['create', 'read', 'update', 'delete', 'assign', 'export'],
  evidence: ['create', 'read', 'update', 'delete', 'upload', 'export'],
  policy: ['create', 'read', 'update', 'delete', 'publish', 'approve'],
  risk: ['create', 'read', 'update', 'delete', 'assess', 'export'],
  vendor: ['create', 'read', 'update', 'delete', 'assess'],
  task: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update', 'export'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete', 'respond'],
  integration: ['create', 'read', 'update', 'delete'],
  app: ['read'],
  portal: ['read', 'update'],
} as const;

const ac = createAccessControl(statement);

const owner = ac.newRole({
  ...ownerAc.statements,
  organization: ['read', 'update', 'delete'],
  control: ['create', 'read', 'update', 'delete', 'assign', 'export'],
  evidence: ['create', 'read', 'update', 'delete', 'upload', 'export'],
  policy: ['create', 'read', 'update', 'delete', 'publish', 'approve'],
  risk: ['create', 'read', 'update', 'delete', 'assess', 'export'],
  vendor: ['create', 'read', 'update', 'delete', 'assess'],
  task: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update', 'export'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete', 'respond'],
  integration: ['create', 'read', 'update', 'delete'],
  app: ['read'],
  portal: ['read', 'update'],
});

const admin = ac.newRole({
  ...adminAc.statements,
  organization: ['read', 'update'],
  control: ['create', 'read', 'update', 'delete', 'assign', 'export'],
  evidence: ['create', 'read', 'update', 'delete', 'upload', 'export'],
  policy: ['create', 'read', 'update', 'delete', 'publish', 'approve'],
  risk: ['create', 'read', 'update', 'delete', 'assess', 'export'],
  vendor: ['create', 'read', 'update', 'delete', 'assess'],
  task: ['create', 'read', 'update', 'delete', 'assign', 'complete'],
  framework: ['create', 'read', 'update', 'delete'],
  audit: ['create', 'read', 'update', 'export'],
  finding: ['create', 'read', 'update', 'delete'],
  questionnaire: ['create', 'read', 'update', 'delete', 'respond'],
  integration: ['create', 'read', 'update', 'delete'],
  app: ['read'],
  portal: ['read', 'update'],
});

const auditor = ac.newRole({
  organization: ['read'],
  member: ['create'],
  invitation: ['create'],
  control: ['read', 'export'],
  evidence: ['read', 'export'],
  policy: ['read'],
  risk: ['read', 'export'],
  vendor: ['read'],
  task: ['read'],
  framework: ['read'],
  audit: ['read', 'export'],
  finding: ['create', 'read', 'update'],
  questionnaire: ['read'],
  integration: ['read'],
  app: ['read'],
  portal: ['read'],
});

const employee = ac.newRole({
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  questionnaire: ['read', 'respond'],
  portal: ['read', 'update'],
});

const contractor = ac.newRole({
  task: ['read', 'complete'],
  evidence: ['read', 'upload'],
  policy: ['read'],
  portal: ['read', 'update'],
});

const allRoles = {
  owner,
  admin,
  auditor,
  employee,
  contractor,
} as const;

// ============================================================================
// Auth Server Configuration
// ============================================================================

const MAGIC_LINK_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/**
 * Determine the cookie domain based on environment.
 */
function getCookieDomain(): string | undefined {
  const baseUrl =
    process.env.AUTH_BASE_URL || process.env.BETTER_AUTH_URL || '';

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

  if (process.env.SECRET_KEY.length < 32) {
    throw new Error(
      'SECURITY ERROR: SECRET_KEY must be at least 32 characters long for security.',
    );
  }

  // Warn about development defaults in production
  if (process.env.NODE_ENV === 'production') {
    const baseUrl =
      process.env.AUTH_BASE_URL || process.env.BETTER_AUTH_URL || '';
    if (baseUrl.includes('localhost')) {
      console.warn(
        'SECURITY WARNING: AUTH_BASE_URL contains "localhost" in production. ' +
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
 * IMPORTANT: For OAuth to work correctly with the app's auth proxy:
 * - Set AUTH_BASE_URL to the app's URL (e.g., http://localhost:3000 in dev)
 * - This ensures OAuth callbacks point to the app, which proxies to this API
 * - Cookies will be set for the app's domain, not the API's domain
 *
 * In production, use the app's public URL (e.g., https://app.trycomp.ai)
 */
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  // Use AUTH_BASE_URL pointing to the app (client), not the API itself
  // This is critical for OAuth callbacks and cookie domains to work correctly
  baseURL:
    process.env.AUTH_BASE_URL ||
    process.env.BETTER_AUTH_URL ||
    'http://localhost:3000',
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      generateId: false,
    },
    ...(cookieDomain && {
      cookies: {
        sessionToken: {
          attributes: {
            domain: cookieDomain,
            sameSite: 'lax' as const,
            secure: true,
          },
        },
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
        await sendInviteMemberEmail({
          inviteeEmail: data.email,
          inviteLink: data.invitation.id,
          organizationName: data.organization.name,
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
        maximumRolesPerOrganization: 20,
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
        if (process.env.NODE_ENV === 'development') {
          console.log('[Auth] Sending magic link to:', email);
        }
        await sendEmail({
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
        await sendEmail({
          to: email,
          subject: 'One-Time Password for Comp AI',
          react: OTPVerificationEmail({ email, otp }),
        });
      },
    }),
    jwt({
      jwt: {
        definePayload: ({ user }) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        }),
        expirationTime: '1h',
      },
      // IMPORTANT: Set rotationInterval to prevent JWKS key regeneration on every request
      // Without this, new keys are created constantly, invalidating existing JWTs
      // See: https://github.com/better-auth/better-auth/issues/6215
      jwks: {
        rotationInterval: 60 * 60 * 24 * 30, // 30 days - rotate keys monthly
        gracePeriod: 60 * 60 * 24 * 7, // 7 days - old keys remain valid for a week after rotation
      },
    }),
    bearer(),
    multiSession(),
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
  },
  verification: {
    modelName: 'Verification',
  },
});

export type Auth = typeof auth;

/**
 * Clean up JWKS records encrypted with a previous secret.
 *
 * BetterAuth encrypts JWKS private keys using SECRET_KEY. When the secret
 * changes, existing keys can't be decrypted, causing all auth operations to
 * fail with "Failed to decrypt private key". This function detects the
 * mismatch on startup and removes stale records so BetterAuth can regenerate
 * fresh keys automatically.
 */
export async function cleanupStaleJwks(): Promise<void> {
  const secret = process.env.SECRET_KEY;
  if (!secret) return;

  try {
    const record = await db.jwks.findFirst();
    if (!record) return;

    try {
      await symmetricDecrypt({ key: secret, data: record.privateKey });
    } catch {
      console.warn(
        '[Auth] JWKS keys were encrypted with a different secret. ' +
          'Removing stale keys — fresh keys will be generated automatically.',
      );
      await db.jwks.deleteMany();
      console.warn('[Auth] Stale JWKS keys removed.');
    }
  } catch (error) {
    console.error('[Auth] Error during JWKS startup check:', error);
  }
}

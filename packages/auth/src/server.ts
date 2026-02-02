import type { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, emailOTP, jwt, magicLink, multiSession, organization } from 'better-auth/plugins';
import { ac, allRoles } from './permissions';

export interface CreateAuthServerOptions {
  db: PrismaClient;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  cookieDomain?: string;

  // Social providers
  socialProviders?: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
    };
    microsoft?: {
      clientId: string;
      clientSecret: string;
      tenantId?: string;
    };
  };

  // Email functions - injected by the consuming app
  email: {
    sendMagicLink: (params: { email: string; url: string }) => Promise<void>;
    sendOTP: (params: { email: string; otp: string }) => Promise<void>;
    sendInvitation: (params: {
      email: string;
      inviteLink: string;
      organizationName: string;
    }) => Promise<void>;
  };
}

const MAGIC_LINK_EXPIRES_IN_SECONDS = 60 * 60; // 1 hour

/**
 * Creates a better-auth server instance with the shared configuration.
 * This factory allows the API to run the auth server while sharing
 * the core configuration (roles, plugins, etc.) with other apps.
 */
export function createAuthServer(options: CreateAuthServerOptions) {
  const {
    db,
    secret,
    baseURL,
    trustedOrigins,
    cookieDomain,
    socialProviders = {},
    email,
  } = options;

  // Build social providers config
  const providers: Record<string, unknown> = {};

  if (socialProviders.google) {
    providers.google = socialProviders.google;
  }

  if (socialProviders.github) {
    providers.github = socialProviders.github;
  }

  if (socialProviders.microsoft) {
    providers.microsoft = {
      ...socialProviders.microsoft,
      tenantId: socialProviders.microsoft.tenantId ?? 'common',
      prompt: 'select_account',
    };
  }

  return betterAuth({
    database: prismaAdapter(db, {
      provider: 'postgresql',
    }),
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      database: {
        // Enable DB-based ID generation for custom Prisma IDs
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
            console.log('[Better Auth] Session creation hook called for user:', session.userId);
            try {
              // Find the user's first organization to set as active
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
                console.log(
                  `[Better Auth] Setting activeOrganizationId to ${userOrganization.id} (${userOrganization.name}) for user ${session.userId}`,
                );
                return {
                  data: {
                    ...session,
                    activeOrganizationId: userOrganization.id,
                  },
                };
              } else {
                console.log(`[Better Auth] No organization found for user ${session.userId}`);
                return {
                  data: session,
                };
              }
            } catch (error) {
              console.error('[Better Auth] Session creation hook error:', error);
              return {
                data: session,
              };
            }
          },
        },
      },
    },
    secret,
    plugins: [
      organization({
        membershipLimit: 100000000000,
        async sendInvitationEmail(data) {
          await email.sendInvitation({
            email: data.email,
            inviteLink: data.invitation.id, // The consuming app constructs the full URL
            organizationName: data.organization.name,
          });
        },
        ac,
        roles: allRoles,
        schema: {
          organization: {
            modelName: 'Organization',
          },
        },
      }),
      magicLink({
        expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
        sendMagicLink: async ({ email: emailAddress, url }) => {
          await email.sendMagicLink({ email: emailAddress, url });
        },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        async sendVerificationOTP({ email: emailAddress, otp }) {
          await email.sendOTP({ email: emailAddress, otp });
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
      }),
      bearer(),
      multiSession(),
    ],
    socialProviders: providers,
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
}

export type AuthServer = ReturnType<typeof createAuthServer>;

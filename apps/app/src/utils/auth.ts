import { env } from '@/env.mjs';
import { MagicLinkEmail, OTPVerificationEmail } from '@comp/email';
import { sendInviteMemberEmail } from '@comp/email/lib/invite-member';
import { sendEmail } from '@comp/email/lib/resend';
import { db } from '@db';
import { dubAnalytics } from '@dub/better-auth';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { bearer, emailOTP, jwt, magicLink, multiSession, organization } from 'better-auth/plugins';
import { Dub } from 'dub';
import { ac, allRoles } from './permissions';

const dub = env.DUB_API_KEY
  ? new Dub({
      token: env.DUB_API_KEY,
    })
  : undefined;

let socialProviders = {};

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  socialProviders = {
    ...socialProviders,
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    },
  };
}

if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
  socialProviders = {
    ...socialProviders,
    github: {
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    },
  };
}

if (env.AUTH_MICROSOFT_CLIENT_ID && env.AUTH_MICROSOFT_CLIENT_SECRET) {
  socialProviders = {
    ...socialProviders,
    microsoft: {
      clientId: env.AUTH_MICROSOFT_CLIENT_ID,
      clientSecret: env.AUTH_MICROSOFT_CLIENT_SECRET,
      tenantId: 'common', // Allows any Microsoft account
      prompt: 'select_account', // Forces account selection
    },
  };
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS
    ? process.env.AUTH_TRUSTED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'https://*.trycomp.ai', 'http://localhost:3002'],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      // This will enable us to fall back to DB for ID generation.
      // It's important so we can use custom IDs specified in Prisma Schema.
      generateId: false,
    },
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
                createdAt: 'desc', // Get the most recently joined organization
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
            // Fallback: create session without organization
            return {
              data: session,
            };
          }
        },
      },
    },
  },
  secret: process.env.AUTH_SECRET!,
  plugins: [
    organization({
      membershipLimit: 100000000000,
      async sendInvitationEmail(data) {
        const isLocalhost = process.env.NODE_ENV === 'development';
        const protocol = isLocalhost ? 'http' : 'https';

        const betterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
        const isDevEnv = betterAuthUrl?.includes('dev.trycomp.ai');
        const isProdEnv = betterAuthUrl?.includes('app.trycomp.ai');

        const domain = isDevEnv
          ? 'dev.trycomp.ai'
          : isProdEnv
            ? 'app.trycomp.ai'
            : 'localhost:3000';
        const inviteLink = `${protocol}://${domain}/invite/${data.invitation.id}`;

        const url = `${protocol}://${domain}/auth`;

        await sendInviteMemberEmail({
          inviteeEmail: data.email,
          inviteLink,
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
      sendMagicLink: async ({ email, url }, request) => {
        const urlWithInviteCode = `${url}`;
        await sendEmail({
          to: email,
          subject: 'Login to Comp AI',
          react: MagicLinkEmail({
            email,
            url: urlWithInviteCode,
          }),
        });
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: 'One-Time Password for Comp AI',
          react: OTPVerificationEmail({ email, otp }),
        });
      },
    }),
    jwt({
      jwt: {
        definePayload: ({ user }) => {
          // Only include essential user information for API authentication
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          };
        },
        expirationTime: '1h', // Extend from default 15 minutes to 1 hour for better UX
      },
    }), // Enable JWT token generation and JWKS endpoints
    bearer(), // Enable Bearer token authentication for client-side API calls
    nextCookies(),
    ...(dub ? [dubAnalytics({ dubClient: dub })] : []),
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

export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization;
export type Member = typeof auth.$Infer.Member;
export type Organization = typeof auth.$Infer.Organization;
export type Invitation = typeof auth.$Infer.Invitation;
export type Role = typeof auth.$Infer.Member.role;

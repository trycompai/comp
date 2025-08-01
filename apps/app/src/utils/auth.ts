import { env } from '@/env.mjs';
import { isHubSpotConfigured } from '@/hubspot/api-client';
import { createContact, findContactByEmail } from '@/hubspot/contacts';
import { MagicLinkEmail, OTPVerificationEmail } from '@comp/email';
import { sendInviteMemberEmail } from '@comp/email/lib/invite-member';
import { sendEmail } from '@comp/email/lib/resend';
import { db } from '@db';
import { dubAnalytics } from '@dub/better-auth';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, magicLink, organization } from 'better-auth/plugins';
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

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  trustedOrigins: [
    'http://localhost:3000',
    'https://app.trycomp.ai',
    'https://app.staging.trycomp.ai',
  ],
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
    user: {
      create: {
        after: async (user) => {
          // Create HubSpot contact when new user signs up
          if (isHubSpotConfigured()) {
            try {
              console.log('[HubSpot] Creating contact for new user:', user.email);

              // Check if contact already exists
              const existingContact = await findContactByEmail(user.email);

              if (!existingContact.contactId) {
                // Create new contact
                await createContact(user.email);
              }
            } catch (error) {
              console.error('[HubSpot] Error creating contact on signup:', error);
              // Don't throw - we don't want to block signup if HubSpot fails
            }
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Get the user's most recent organization
          const userOrg = await db.organization.findFirst({
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
          });

          // Set the active organization if user has one
          if (userOrg) {
            return {
              data: {
                ...session,
                activeOrganizationId: userOrg.id,
              },
            };
          }

          return {
            data: session,
          };
        },
      },
    },
  },
  secret: process.env.AUTH_SECRET!,
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const isLocalhost = process.env.NODE_ENV === 'development';
        const protocol = isLocalhost ? 'http' : 'https';

        const betterAuthUrl = process.env.BETTER_AUTH_URL;
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
    nextCookies(),
    ...(dub ? [dubAnalytics({ dubClient: dub })] : []),
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

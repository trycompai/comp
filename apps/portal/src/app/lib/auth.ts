import { env } from '@/env.mjs';
import { OTPVerificationEmail, sendEmail, sendInviteMemberEmail } from '@comp/email';
import { db } from '@db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, multiSession, organization } from 'better-auth/plugins';
import { ac, admin, auditor, contractor, employee, owner } from './permissions';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  advanced: {
    database: {
      // This will enable us to fall back to DB for ID generation.
      // It's important so we can use custom IDs specified in Prisma Schema.
      generateId: false,
    },
  },
  trustedOrigins: ['http://localhost:3000', 'https://*.trycomp.ai'],
  secret: env.AUTH_SECRET!,
  plugins: [
    organization({
      membershipLimit: 100000000000,
      async sendInvitationEmail(data) {
        console.log(
          'process.env.NEXT_PUBLIC_BETTER_AUTH_URL',
          process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
        );

        const isLocalhost = process.env.NODE_ENV === 'development';
        const protocol = isLocalhost ? 'http' : 'https';
        const domain = isLocalhost ? 'localhost:3000' : process.env.NEXT_PUBLIC_BETTER_AUTH_URL!;
        const inviteLink = `${protocol}://${domain}/invite/${data.invitation.id}`;

        const url = `${protocol}://${domain}/auth`;

        await sendInviteMemberEmail({
          inviteeEmail: data.email,
          inviteLink,
          organizationName: data.organization.name,
        });
      },
      ac,
      roles: {
        owner,
        admin,
        auditor,
        employee,
        contractor,
      },
      schema: {
        organization: {
          modelName: 'Organization',
        },
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      // Prevent automatic user creation on OTP sign-in
      disableSignUp: true,
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: 'One-Time Password for Comp AI',
          react: OTPVerificationEmail({ email, otp }),
        });
      },
    }),
    nextCookies(),
    multiSession(),
  ],
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
    ...(process.env.AUTH_MICROSOFT_CLIENT_ID && process.env.AUTH_MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: process.env.AUTH_MICROSOFT_CLIENT_ID,
            clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET,
            tenantId: 'common',
            prompt: 'select_account',
          },
        }
      : {}),
  },
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
      trustedProviders: ['google', 'microsoft'],
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

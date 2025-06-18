import { db } from '@comp/db';
import { OTPVerificationEmail } from '@comp/email';
import { sendInviteMemberEmail } from '@comp/email/lib/invite-member';
import { sendEmail } from '@comp/email/lib/resend';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP, organization } from 'better-auth/plugins';
import { ac, admin, auditor, employee, owner } from './permissions';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  advanced: {
    // This will enable us to fall back to DB for ID generation.
    // It's important so we can use custom IDs specified in Prisma Schema.
    generateId: false,
  },
  secret: process.env.AUTH_SECRET!,
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const isLocalhost = process.env.NODE_ENV === 'development';
        const protocol = isLocalhost ? 'http' : 'https';
        const domain = isLocalhost ? 'localhost:3000' : 'app.trycomp.ai';
        const inviteLink = `${protocol}://${domain}/invite/${data.invitation.id}`;

        const url = `${protocol}://${domain}/auth`;

        await sendInviteMemberEmail({
          email: data.email,
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
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: 'One-Time Password for Comp AI',
          react: OTPVerificationEmail({ email, otp }),
        });
      },
    }),
    nextCookies(),
  ],
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
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

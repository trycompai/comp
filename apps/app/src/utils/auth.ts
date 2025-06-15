import { env } from "@/env.mjs";
import { db } from "@comp/db";
import { MagicLinkEmail, OTPVerificationEmail } from "@comp/email";
import { sendInviteMemberEmail } from "@comp/email/lib/invite-member";
import { sendEmail } from "@comp/email/lib/resend";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, magicLink, organization } from "better-auth/plugins";
import { ac, allRoles } from "./permissions";

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
    provider: "postgresql",
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "https://app.trycomp.ai",
    "https://dev.trycomp.ai",
  ],
  advanced: {
    database: {
      // This will enable us to fall back to DB for ID generation.
      // It's important so we can use custom IDs specified in Prisma Schema.
      generateId: false,
    },
  },
  secret: process.env.AUTH_SECRET!,
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        const isLocalhost = process.env.NODE_ENV === "development";
        const protocol = isLocalhost ? "http" : "https";

        const betterAuthUrl = process.env.BETTER_AUTH_URL;
        const isDevEnv = betterAuthUrl?.includes("dev.trycomp.ai");
        const isProdEnv = betterAuthUrl?.includes("app.trycomp.ai");

        const domain = isDevEnv
          ? "dev.trycomp.ai"
          : isProdEnv
            ? "app.trycomp.ai"
            : "localhost:3000";
        const inviteLink = `${protocol}://${domain}/auth?inviteCode=${data.invitation.id}`;

        await sendInviteMemberEmail({
          email: data.email,
          inviteLink,
          organizationName: data.organization.name,
        });
      },
      ac,
      roles: allRoles,
      schema: {
        organization: {
          modelName: "Organization",
        },
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }, request) => {
        const urlWithInviteCode = `${url}`;
        await sendEmail({
          to: email,
          subject: "Login to Comp AI",
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
          subject: "One-Time Password for Comp AI",
          react: OTPVerificationEmail({ email, otp }),
        });
      },
    }),
    nextCookies(),
  ],
  socialProviders,
  user: {
    modelName: "User",
  },
  organization: {
    modelName: "Organization",
  },
  member: {
    modelName: "Member",
  },
  invitation: {
    modelName: "Invitation",
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
});

export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization;
export type Member = typeof auth.$Infer.Member;
export type Organization = typeof auth.$Infer.Organization;
export type Invitation = typeof auth.$Infer.Invitation;
export type Role = typeof auth.$Infer.Member.role;

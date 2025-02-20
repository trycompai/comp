import { db } from "@bubba/db";
import { OTPVerificationEmail } from "@bubba/email/emails/otp"
import { sendEmail } from "@bubba/email/lib/resend"
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { customSession, emailOTP } from "better-auth/plugins";

const options = {
  plugins: [
    nextCookies(),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp }) {
        await sendEmail({
          to: email,
          subject: "One-Time Password for Comp AI",
          react: OTPVerificationEmail({ email, otp }),
        });
      }
    }),
  ]
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  user: {
    modelName: "PortalUser",
    additionalFields: {
      organizationId: {
        type: "string",
        required: false,
        nullable: true,
        input: false,
      }
    },
  },
  session: {
    modelName: "PortalSession",
  },
  account: {
    modelName: "PortalAccount",
  },
  verification: {
    modelName: "PortalVerification",
  },
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ user, session }) => {
      const organization = await getOrganization(user.id);

      return {
        session,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          image: user.image,
          organizationId: organization?.organizationId ?? null,
          organization: organization?.organization?.name ?? null,
        }
      };
    }, options),
  ],
});

async function getOrganization(userId: string) {
  return await db.portalUser.findFirst({
    where: {
      id: userId,
    },
    select: {
      organizationId: true,
      organization: {
        select: {
          name: true,
        }
      }
    }
  })
}

type Session = typeof auth.$Infer.Session;
import { db } from "@bubba/db";
import { OTPVerificationEmail } from "@bubba/email/emails/otp"
import { sendEmail } from "@bubba/email/lib/resend"
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";

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
    })
  ]
});

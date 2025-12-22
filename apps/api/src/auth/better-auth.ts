import { db } from '@trycompai/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import {
  bearer,
  emailOTP,
  jwt,
  multiSession,
  organization,
} from 'better-auth/plugins';
import * as React from 'react';
import { sendEmail } from '../email/resend';

/**
 * Canonical Better Auth instance.
 *
 * Served from apps/api at `/api/auth/*` (mounted in `src/main.ts`).
 *
 * IMPORTANT:
 * - `baseURL` MUST match `BETTER_AUTH_URL` so JWT issuer/audience verification works.
 * - Apps (Next.js) should treat this as the single auth server (clients point to API).
 */
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  // Social OAuth providers (e.g. Google/Microsoft).
  // These must be configured on the canonical auth server (apps/api), not in the Next.js apps.
  socialProviders: {
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? {
          google: {
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          },
        }
      : {}),
    ...(process.env.AUTH_MICROSOFT_CLIENT_ID &&
    process.env.AUTH_MICROSOFT_CLIENT_SECRET
      ? {
          microsoft: {
            clientId: process.env.AUTH_MICROSOFT_CLIENT_ID,
            clientSecret: process.env.AUTH_MICROSOFT_CLIENT_SECRET,
          },
        }
      : {}),
  },
  trustedOrigins: process.env.AUTH_TRUSTED_ORIGINS
    ? process.env.AUTH_TRUSTED_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3333',
        'https://*.trycomp.ai',
      ],
  advanced: {
    database: {
      generateId: false,
    },
  },
  secret: process.env.AUTH_SECRET!,
  plugins: [
    organization({
      membershipLimit: 100000000000,
      schema: {
        organization: { modelName: 'Organization' },
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
          react: createOtpEmail({ email, otp }),
          system: true,
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
    }),
    bearer(),
    multiSession(),
  ],
  user: { modelName: 'User' },
  organization: { modelName: 'Organization' },
  member: { modelName: 'Member' },
  invitation: { modelName: 'Invitation' },
  session: { modelName: 'Session' },
  // OAuth state cookies can be blocked in dev when the app origin (localhost) and auth origin (ngrok)
  // don't match, causing `state_mismatch`. Prefer using a single domain for app+auth, but allow
  // an explicit dev escape hatch.
  account: {
    modelName: 'Account',
    skipStateCookieCheck:
      process.env.AUTH_SKIP_OAUTH_STATE_COOKIE_CHECK === 'true',
  },
  verification: { modelName: 'Verification' },
});

function createOtpEmail({
  email,
  otp,
}: {
  email: string;
  otp: string;
}): React.ReactElement {
  return React.createElement(
    'div',
    { style: { fontFamily: 'ui-sans-serif, system-ui, -apple-system' } },
    React.createElement(
      'h1',
      { style: { fontSize: 18, margin: 0 } },
      'Your one-time password',
    ),
    React.createElement(
      'p',
      { style: { marginTop: 12, marginBottom: 12 } },
      'Use this code to sign in as ',
      React.createElement('strong', null, email),
      ':',
    ),
    React.createElement(
      'div',
      {
        style: {
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 2,
          padding: '12px 16px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          display: 'inline-block',
        },
      },
      otp,
    ),
    React.createElement(
      'p',
      { style: { marginTop: 12, color: '#6b7280' } },
      'This code expires in 10 minutes. If you didn’t request it, you can ignore this email.',
    ),
  );
}

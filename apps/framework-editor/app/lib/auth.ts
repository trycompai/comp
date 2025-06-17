import { db } from '@comp/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not defined');
}

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
  throw new Error('AUTH_GOOGLE_ID or AUTH_GOOGLE_SECRET is not defined');
}

const socialProviders = {
  google: {
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  },
};

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
  secret: process.env.AUTH_SECRET!,
  plugins: [nextCookies()],
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

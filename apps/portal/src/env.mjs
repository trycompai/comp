import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.string(),
    RESEND_API_KEY: z.string().optional(),
    RELAY_SMTP_HOST: z.string().optional(),
    RELAY_SMTP_PORT: z.string().optional(),
    RELAY_SMTP_USER: z.string().optional(),
    RELAY_SMTP_PASS: z.string().optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    AUTH_MICROSOFT_CLIENT_ID: z.string().optional(),
    AUTH_MICROSOFT_CLIENT_SECRET: z.string().optional(),
    AUTH_SECRET: z.string(),
    INTERNAL_API_TOKEN: z.string().optional(),
  },

  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    NEXT_PUBLIC_BETTER_AUTH_URL: z.string(),
    NEXT_PUBLIC_API_URL: z.string().optional(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RELAY_SMTP_HOST: process.env.RELAY_SMTP_HOST,
    RELAY_SMTP_PORT: process.env.RELAY_SMTP_PORT,
    RELAY_SMTP_USER: process.env.RELAY_SMTP_USER,
    RELAY_SMTP_PASS: process.env.RELAY_SMTP_PASS,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_MICROSOFT_CLIENT_ID: process.env.AUTH_MICROSOFT_CLIENT_ID,
    AUTH_MICROSOFT_CLIENT_SECRET: process.env.AUTH_MICROSOFT_CLIENT_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    INTERNAL_API_TOKEN: process.env.INTERNAL_API_TOKEN,
  },

  createFinalSchema: (shape, isServer) => {
    const schema = z.object(shape);
    if (!isServer) {
      return schema;
    }

    return schema.superRefine((data, ctx) => {
      if (data.RESEND_API_KEY) {
        return;
      }

      const relayKeys = ['RELAY_SMTP_HOST', 'RELAY_SMTP_PORT', 'RELAY_SMTP_USER', 'RELAY_SMTP_PASS'];
      const missingRelayKeys = relayKeys.filter((key) => !data[key]);

      if (missingRelayKeys.length === 0) {
        return;
      }

      ctx.addIssue({
        code: 'mail-config',
        message: 'Set RESEND_API_KEY or all RELAY_SMTP_* values.',
        path: ['RESEND_API_KEY', ...relayKeys],
      });
    });
  },

  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});

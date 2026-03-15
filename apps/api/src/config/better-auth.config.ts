import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const betterAuthConfigSchema = z.object({
  url: z.string().url('BASE_URL must be a valid URL'),
});

export type BetterAuthConfig = z.infer<typeof betterAuthConfigSchema>;

/**
 * Better Auth configuration for the API.
 *
 * BASE_URL should point to the API itself since the API is the auth server.
 * For example:
 * - Production: https://api.trycomp.ai
 * - Staging: https://api.staging.trycomp.ai
 * - Development: http://localhost:3333
 */
export const betterAuthConfig = registerAs(
  'betterAuth',
  (): BetterAuthConfig => {
    const url = process.env.BASE_URL;

    if (!url) {
      throw new Error('BASE_URL environment variable is required');
    }

    const config = { url };

    const result = betterAuthConfigSchema.safeParse(config);

    if (!result.success) {
      throw new Error(
        `Better Auth configuration validation failed: ${result.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`,
      );
    }

    return result.data;
  },
);

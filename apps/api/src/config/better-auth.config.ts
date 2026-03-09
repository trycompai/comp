import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const betterAuthConfigSchema = z.object({
  url: z.string().url('AUTH_BASE_URL must be a valid URL'),
});

export type BetterAuthConfig = z.infer<typeof betterAuthConfigSchema>;

/**
 * Better Auth configuration for the API.
 *
 * Since the API now runs the auth server, AUTH_BASE_URL should point to the API itself.
 * For example:
 * - Production: https://api.trycomp.ai
 * - Staging: https://api.staging.trycomp.ai
 * - Development: http://localhost:3333
 */
export const betterAuthConfig = registerAs(
  'betterAuth',
  (): BetterAuthConfig => {
    // AUTH_BASE_URL is the URL of the auth server (which is now the API)
    // Fall back to BETTER_AUTH_URL for backwards compatibility during migration
    const url = process.env.AUTH_BASE_URL || process.env.BETTER_AUTH_URL;

    if (!url) {
      throw new Error('AUTH_BASE_URL or BETTER_AUTH_URL environment variable is required');
    }

    const config = { url };

    // Validate configuration at startup
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

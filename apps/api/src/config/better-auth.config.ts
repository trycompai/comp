import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const betterAuthConfigSchema = z.object({
  url: z.string().url('BETTER_AUTH_URL must be a valid URL'),
});

export type BetterAuthConfig = z.infer<typeof betterAuthConfigSchema>;

export const betterAuthConfig = registerAs(
  'betterAuth',
  (): BetterAuthConfig => {
    const url = process.env.BETTER_AUTH_URL;

    if (!url) {
      throw new Error('BETTER_AUTH_URL environment variable is required');
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

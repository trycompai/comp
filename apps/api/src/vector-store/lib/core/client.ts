import { Index } from '@upstash/vector';
import { logger } from '../../logger';

const upstashUrl = process.env.UPSTASH_VECTOR_REST_URL;
const upstashToken = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!upstashUrl || !upstashToken) {
  logger.warn(
    'Upstash Vector credentials not configured. Vector search functionality will be disabled.',
  );
}

export const vectorIndex: Index | null =
  upstashUrl && upstashToken
    ? new Index({
        url: upstashUrl,
        token: upstashToken,
      })
    : null;

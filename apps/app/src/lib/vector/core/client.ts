import "server-only";

import { env } from "@/env.mjs";
import { Index } from "@upstash/vector";

if (!env.UPSTASH_VECTOR_REST_URL || !env.UPSTASH_VECTOR_REST_TOKEN) {
  console.warn(
    "Upstash Vector credentials not configured. Vector search functionality will be disabled.",
  );
}

export const vectorIndex =
  env.UPSTASH_VECTOR_REST_URL && env.UPSTASH_VECTOR_REST_TOKEN
    ? new Index({
        url: env.UPSTASH_VECTOR_REST_URL,
        token: env.UPSTASH_VECTOR_REST_TOKEN,
      })
    : null;

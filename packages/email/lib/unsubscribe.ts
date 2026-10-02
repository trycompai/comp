import { createHmac } from 'node:crypto';

/**
 * Resolve the HMAC secret used to sign/verify unsubscribe tokens.
 * Resolved lazily (not at module load) so importing this package never
 * throws — only generating a token without a configured secret does.
 */
function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'UNSUBSCRIBE_SECRET (or AUTH_SECRET) must be configured to generate unsubscribe tokens',
    );
  }
  return secret;
}

/**
 * Get the base URL for unsubscribe links based on environment
 * Uses NEXT_PUBLIC_BETTER_AUTH_URL for staging/prod, falls back to NEXT_PUBLIC_APP_URL,
 * and handles localhost for local development
 */
function getBaseUrl(): string {
  // Prefer NEXT_PUBLIC_BETTER_AUTH_URL (used for staging/prod)
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  }

  // Fallback to NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Default fallback
  return 'https://app.trycomp.ai';
}

/**
 * Generate a secure unsubscribe token for an email address
 */
export function generateUnsubscribeToken(email: string): string {
  const hmac = createHmac('sha256', getUnsubscribeSecret());
  hmac.update(email);
  return hmac.digest('base64url');
}

/**
 * Generate an unsubscribe URL for an email address (preferences page)
 */
export function getUnsubscribeUrl(email: string): string {
  const token = generateUnsubscribeToken(email);
  const baseUrl = getBaseUrl();
  return `${baseUrl}/unsubscribe/preferences?email=${encodeURIComponent(email)}&token=${token}`;
}

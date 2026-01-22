import { createHmac } from 'node:crypto';

const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET || 'fallback-secret';

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
  const hmac = createHmac('sha256', UNSUBSCRIBE_SECRET);
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

'use client';

/**
 * Session token manager for API authentication.
 *
 * Uses better-auth's bearer plugin to get session tokens via /api/auth/token.
 * Session tokens carry activeOrganizationId, so the API can resolve org context
 * without a separate X-Organization-Id header.
 *
 * Much simpler than the previous JWT approach:
 * - No localStorage (tokens stored in memory only)
 * - No refresh timers (re-fetched on 401)
 * - No JWT decode or expiry tracking
 */
class SessionTokenManager {
  private token: string | null = null;
  private fetchPromise: Promise<string | null> | null = null;

  /**
   * Get the current session token, fetching one if needed.
   */
  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    return this.fetchToken();
  }

  /**
   * Fetch a fresh session token from the bearer plugin endpoint.
   * Deduplicates concurrent calls.
   */
  async fetchToken(): Promise<string | null> {
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this._doFetch();
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Clear the cached token. Call this on 401 to force a re-fetch.
   */
  clear(): void {
    this.token = null;
  }

  private async _doFetch(): Promise<string | null> {
    try {
      // The bearer plugin exposes /api/auth/token which returns the session token
      // when called with valid session cookies.
      // This goes through the auth proxy (/api/auth/[...all]) which forwards to the API.
      const response = await fetch('/api/auth/token', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        return this.token;
      }

      return null;
    } catch (error) {
      console.error('[SessionToken] Failed to fetch session token:', error);
      return null;
    }
  }
}

export const sessionToken = new SessionTokenManager();

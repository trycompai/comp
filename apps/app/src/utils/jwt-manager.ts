'use client';

import { authClient } from './auth-client';

interface TokenInfo {
  token: string;
  expiresAt: number; // Unix timestamp
}

class JWTManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry
  private readonly STORAGE_KEY = 'bearer_token';
  private readonly EXPIRY_KEY = 'bearer_token_expiry';

  /**
   * Get the current JWT token, refreshing if needed
   */
  async getValidToken(): Promise<string | null> {
    try {
      const stored = this.getStoredToken();

      // If no token or expired, get a fresh one
      if (!stored || this.isTokenExpiringSoon(stored.expiresAt)) {
        console.log('🔄 JWT token missing or expiring soon, fetching fresh token...');
        return await this.refreshToken();
      }

      console.log('✅ Using cached JWT token');
      return stored.token;
    } catch (error) {
      console.error('❌ Error getting valid JWT token:', error);
      return null;
    }
  }

  /**
   * Get a fresh JWT token from Better Auth
   */
  async refreshToken(): Promise<string | null> {
    try {
      console.log('🔄 Refreshing JWT token...');

      let newToken: string | null = null;

      // Try to get JWT from session call
      const sessionResponse = await authClient.getSession({
        fetchOptions: {
          onSuccess: (ctx) => {
            const jwtToken = ctx.response.headers.get('set-auth-jwt');
            if (jwtToken) {
              newToken = jwtToken;
              console.log('✅ JWT token refreshed via session');
            }
          },
        },
      });

      // If that didn't work, try the explicit token endpoint
      if (!newToken) {
        try {
          const tokenResponse = await fetch('/api/auth/token', {
            credentials: 'include',
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            newToken = tokenData.token;
            console.log('✅ JWT token refreshed via token endpoint');
          }
        } catch (error) {
          console.warn('⚠️ Token endpoint failed, using session token');
        }
      }

      if (newToken) {
        this.storeToken(newToken);
        this.scheduleRefresh(newToken);
        return newToken;
      }

      console.error('❌ Failed to refresh JWT token');
      return null;
    } catch (error) {
      console.error('❌ Error refreshing JWT token:', error);
      return null;
    }
  }

  /**
   * Store token with expiry information
   */
  private storeToken(token: string): void {
    try {
      const payload = this.decodeJWTPayload(token);
      const expiresAt = payload.exp * 1000; // Convert to milliseconds

      localStorage.setItem(this.STORAGE_KEY, token);
      localStorage.setItem(this.EXPIRY_KEY, expiresAt.toString());

      console.log(`🔐 JWT token stored, expires at: ${new Date(expiresAt).toISOString()}`);
    } catch (error) {
      console.error('❌ Error storing JWT token:', error);
    }
  }

  /**
   * Get stored token with expiry info
   */
  private getStoredToken(): TokenInfo | null {
    try {
      const token = localStorage.getItem(this.STORAGE_KEY);
      const expiryStr = localStorage.getItem(this.EXPIRY_KEY);

      if (!token || !expiryStr) return null;

      return {
        token,
        expiresAt: parseInt(expiryStr, 10),
      };
    } catch (error) {
      console.error('❌ Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Check if token is expiring soon
   */
  private isTokenExpiringSoon(expiresAt: number): boolean {
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    return timeUntilExpiry <= this.REFRESH_THRESHOLD;
  }

  /**
   * Decode JWT payload without verification (client-side only)
   */
  private decodeJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      throw new Error('Invalid JWT token format');
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(token: string): void {
    try {
      // Clear existing timer
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
      }

      const payload = this.decodeJWTPayload(token);
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const refreshIn = Math.max(0, expiresAt - now - this.REFRESH_THRESHOLD);

      console.log(`⏰ Scheduling JWT refresh in ${Math.round(refreshIn / 1000 / 60)} minutes`);

      this.refreshTimer = setTimeout(async () => {
        console.log('⏰ Auto-refreshing JWT token...');
        await this.refreshToken();
      }, refreshIn);
    } catch (error) {
      console.error('❌ Error scheduling token refresh:', error);
    }
  }

  /**
   * Initialize the JWT manager (call this once on app start)
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing JWT Manager...');

    // Get a valid token and set up refresh schedule
    const token = await this.getValidToken();

    if (token) {
      this.scheduleRefresh(token);
    }
  }

  /**
   * Clean up timers and storage
   */
  cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.EXPIRY_KEY);
    console.log('🧹 JWT Manager cleaned up');
  }

  /**
   * Force refresh token (useful for testing or manual refresh)
   */
  async forceRefresh(): Promise<string | null> {
    console.log('🔄 Force refreshing JWT token...');
    return await this.refreshToken();
  }
}

// Export a singleton instance
export const jwtManager = new JWTManager();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  jwtManager.initialize();
}

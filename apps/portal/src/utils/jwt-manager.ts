'use client';

import { authClient } from '@/app/lib/auth-client';
import { env } from '@/env.mjs';

interface TokenInfo {
  token: string;
  expiresAt: number; // Unix timestamp ms
}

class JwtManager {
  private refreshPromise: Promise<string | null> | null = null;
  private lastRefreshAttempt = 0;
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5m
  private readonly REFRESH_COOLDOWN = 2000; // 2s
  private readonly STORAGE_KEY = 'bearer_token';
  private readonly EXPIRY_KEY = 'bearer_token_expiry';

  async getValidToken(): Promise<string | null> {
    const stored = this.getStoredToken();
    if (!stored || this.isTokenExpiringSoon(stored.expiresAt)) {
      return await this.refreshToken();
    }
    return stored.token;
  }

  async forceRefresh(): Promise<string | null> {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.EXPIRY_KEY);
    this.lastRefreshAttempt = 0;
    return await this.refreshToken();
  }

  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) return await this.refreshPromise;

    const now = Date.now();
    const timeSinceLastAttempt = now - this.lastRefreshAttempt;
    if (timeSinceLastAttempt < this.REFRESH_COOLDOWN) {
      const stored = this.getStoredToken();
      if (stored && !this.isTokenExpiringSoon(stored.expiresAt)) {
        return stored.token;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, this.REFRESH_COOLDOWN - timeSinceLastAttempt),
      );
    }

    this.lastRefreshAttempt = Date.now();
    this.refreshPromise = this.doRefreshToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<string | null> {
    try {
      let newToken: string | null = null;

      // Primary: Better Auth session endpoint header
      await authClient.getSession({
        fetchOptions: {
          onSuccess: (ctx) => {
            const jwtToken = ctx.response.headers.get('set-auth-jwt');
            if (jwtToken) newToken = jwtToken;
          },
        },
      });

      // Fallback: bearer plugin token endpoint (if available)
      if (!newToken) {
        try {
          const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/token`, {
            credentials: 'include',
          });
          if (res.ok) {
            const json: unknown = await res.json();
            if (
              typeof json === 'object' &&
              json !== null &&
              'token' in json &&
              typeof (json as { token?: unknown }).token === 'string'
            ) {
              newToken = (json as { token: string }).token;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!newToken) return null;

      this.storeToken(newToken);
      return newToken;
    } catch {
      return null;
    }
  }

  private storeToken(token: string): void {
    const payload = this.decodePayload(token);
    const expiresAt = payload.exp * 1000;
    localStorage.setItem(this.STORAGE_KEY, token);
    localStorage.setItem(this.EXPIRY_KEY, String(expiresAt));
  }

  private getStoredToken(): TokenInfo | null {
    const token = localStorage.getItem(this.STORAGE_KEY);
    const expiryStr = localStorage.getItem(this.EXPIRY_KEY);
    if (!token || !expiryStr) return null;
    const expiresAt = Number(expiryStr);
    if (!Number.isFinite(expiresAt)) return null;
    return { token, expiresAt };
  }

  private isTokenExpiringSoon(expiresAt: number): boolean {
    return expiresAt - Date.now() <= this.REFRESH_THRESHOLD;
  }

  private decodePayload(token: string): { exp: number } {
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('Invalid JWT');
    const payload = JSON.parse(atob(parts[1])) as unknown;
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('exp' in payload) ||
      typeof (payload as { exp?: unknown }).exp !== 'number'
    ) {
      throw new Error('Invalid JWT payload');
    }
    return payload as { exp: number };
  }
}

export const jwtManager = new JwtManager();

if (typeof window !== 'undefined') {
  void jwtManager.getValidToken();
}

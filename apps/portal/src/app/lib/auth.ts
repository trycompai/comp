/**
 * Server-side auth utilities for the Portal.
 *
 * This module provides server-side session validation by calling the NestJS API's
 * auth endpoints. The actual auth server runs on the API — this app only
 * consumes auth services.
 *
 * For browser-side auth (login, logout, hooks), use auth-client.ts instead.
 */

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

const API_URL =
  process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

/**
 * Session type matching better-auth's session structure
 */
export interface Session {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    activeOrganizationId?: string | null;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  inviterId: string;
}

/**
 * Convert Headers to a plain object for fetch
 */
function headersToObject(headers: ReadonlyHeaders | Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'cookie' || key.toLowerCase().startsWith('x-')) {
      obj[key] = value;
    }
  });
  return obj;
}

/**
 * Get the current session from the API.
 */
async function getSession(options: { headers: ReadonlyHeaders | Headers }): Promise<Session | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data as Session;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to get session:', error);
    }
    return null;
  }
}

/**
 * Auth object matching the interface used throughout the portal.
 * All methods call the NestJS API — no local better-auth instance.
 */
export const auth = {
  api: {
    getSession,
  },
};

// Type exports for backwards compatibility with files that imported from better-auth types
export type { Session as SessionType };

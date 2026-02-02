/**
 * Server-side auth utilities for the App.
 *
 * This module provides server-side session validation by calling the API's
 * auth endpoints. The actual auth server runs on the API - this app only
 * consumes auth services.
 *
 * For browser-side auth (login, logout, hooks), use auth-client.ts instead.
 */

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';
import { ac, allRoles } from './permissions';

// Re-export permissions for convenience
export { ac, allRoles };

// IMPORTANT: This must point to the actual API server, not the app itself.
// Use BACKEND_API_URL for server-to-server communication, or fall back to NEXT_PUBLIC_API_URL.
// Do NOT use BETTER_AUTH_URL here - that may be the app's URL for the client-side auth.
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

/**
 * Active organization type
 */
export interface ActiveOrganization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

/**
 * Member type with role information
 */
export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
}

/**
 * Organization type
 */
export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

/**
 * Invitation type
 */
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
 * Role type - matches the roles defined in permissions
 */
export type Role = keyof typeof allRoles;

/**
 * Full session response including organization context
 */
export interface FullSession extends Session {
  activeOrganization?: ActiveOrganization | null;
  activeMember?: Member | null;
}

/**
 * Convert Headers to a plain object for fetch
 */
function headersToObject(headers: ReadonlyHeaders | Headers): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((value, key) => {
    // Forward cookies and other relevant headers
    if (key.toLowerCase() === 'cookie' || key.toLowerCase().startsWith('x-')) {
      obj[key] = value;
    }
  });
  return obj;
}

/**
 * Get the current session from the API.
 *
 * @param options.headers - The request headers (must include cookies)
 * @returns The session data or null if not authenticated
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

    if (!response.ok) {
      return null;
    }

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
 * Get the full session including active organization and member.
 *
 * @param options.headers - The request headers (must include cookies)
 * @returns The full session data or null if not authenticated
 */
async function getFullSession(options: {
  headers: ReadonlyHeaders | Headers;
}): Promise<FullSession | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/get-full-session`, {
      method: 'GET',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as FullSession;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to get full session:', error);
    }
    return null;
  }
}

/**
 * Get the active member for the current session.
 *
 * @param options.headers - The request headers (must include cookies)
 * @returns The active member or null
 */
async function getActiveMember(options: {
  headers: ReadonlyHeaders | Headers;
}): Promise<Member | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/get-active-member`, {
      method: 'GET',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as Member;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to get active member:', error);
    }
    return null;
  }
}

/**
 * Check if the current user has a specific permission.
 *
 * @param options.headers - The request headers (must include cookies)
 * @param options.body.permission - The permission to check
 * @returns Object with success boolean
 */
async function hasPermission(options: {
  headers: ReadonlyHeaders | Headers;
  body: {
    permission: Record<string, string[]>;
  };
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/has-permission`, {
      method: 'POST',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body),
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false, error: 'Request failed' };
    }

    const data = await response.json();
    return { success: data.success === true };
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to check permission:', error);
    }
    return { success: false, error: 'Request failed' };
  }
}

/**
 * List organizations for the current user.
 *
 * @param options.headers - The request headers (must include cookies)
 * @returns Array of organizations or empty array
 */
async function listOrganizations(options: {
  headers: ReadonlyHeaders | Headers;
}): Promise<Organization[]> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/list`, {
      method: 'GET',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data as Organization[]) || [];
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to list organizations:', error);
    }
    return [];
  }
}

/**
 * Set the active organization for the current session.
 */
function setActiveOrganization(options: {
  headers: ReadonlyHeaders | Headers;
  body: { organizationId: string };
  asResponse: true;
}): Promise<Response>;
function setActiveOrganization(options: {
  headers: ReadonlyHeaders | Headers;
  body: { organizationId: string };
  asResponse?: false;
}): Promise<Session | null>;
async function setActiveOrganization(options: {
  headers: ReadonlyHeaders | Headers;
  body: { organizationId: string };
  asResponse?: boolean;
}): Promise<Response | Session | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/set-active`, {
      method: 'POST',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body),
      cache: 'no-store',
    });

    if (options.asResponse) {
      return response;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as Session;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to set active organization:', error);
    }
    if (options.asResponse) {
      return new Response(JSON.stringify({ error: 'Failed to set active organization' }), { status: 500 });
    }
    return null;
  }
}

/**
 * Full organization response including members
 */
export interface FullOrganization extends Organization {
  members: Member[];
  invitations?: Invitation[];
}

/**
 * Get the full organization including members.
 *
 * @param options.headers - The request headers (must include cookies)
 * @returns The full organization or null
 */
async function getFullOrganization(options: {
  headers: ReadonlyHeaders | Headers;
}): Promise<FullOrganization | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/get-full-organization`, {
      method: 'GET',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as FullOrganization;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to get full organization:', error);
    }
    return null;
  }
}

/**
 * Create an invitation to an organization.
 *
 * @param options.headers - The request headers (must include cookies)
 * @param options.body - The invitation data
 * @returns The created invitation or null
 */
async function createInvitation(options: {
  headers: ReadonlyHeaders | Headers;
  body: {
    email: string;
    role: string;
    organizationId: string;
  };
}): Promise<Invitation | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/invite-member`, {
      method: 'POST',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create invitation');
    }

    const data = await response.json();
    return data as Invitation;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to create invitation:', error);
    }
    throw error;
  }
}

/**
 * Add a member to an organization.
 *
 * @param options.headers - The request headers (must include cookies)
 * @param options.body - The member data
 * @returns The created member or null
 */
async function addMember(options: {
  headers: ReadonlyHeaders | Headers;
  body: {
    userId: string;
    role: string;
    organizationId: string;
  };
}): Promise<Member | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/organization/add-member`, {
      method: 'POST',
      headers: {
        ...headersToObject(options.headers),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add member');
    }

    const data = await response.json();
    return data as Member;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to add member:', error);
    }
    throw error;
  }
}

/**
 * Sign up with email and password.
 * Note: This is mainly for testing. In production, use the auth client.
 */
function signUpEmail(options: {
  body: { email: string; password: string; name: string };
  headers?: ReadonlyHeaders | Headers;
  asResponse: true;
}): Promise<Response>;
function signUpEmail(options: {
  body: { email: string; password: string; name: string };
  headers?: ReadonlyHeaders | Headers;
  asResponse?: false;
}): Promise<Session | null>;
async function signUpEmail(options: {
  body: { email: string; password: string; name: string };
  headers?: ReadonlyHeaders | Headers;
  asResponse?: boolean;
}): Promise<Response | Session | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ? headersToObject(options.headers) : {}),
      },
      body: JSON.stringify(options.body),
    });

    if (options.asResponse) {
      return response;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as Session;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to sign up:', error);
    }
    if (options.asResponse) {
      return new Response(JSON.stringify({ error: 'Failed to sign up' }), { status: 500 });
    }
    return null;
  }
}

/**
 * Sign in with email and password.
 * Note: This is mainly for testing. In production, use the auth client.
 */
function signInEmail(options: {
  body: { email: string; password: string };
  headers?: ReadonlyHeaders | Headers;
  asResponse: true;
}): Promise<Response>;
function signInEmail(options: {
  body: { email: string; password: string };
  headers?: ReadonlyHeaders | Headers;
  asResponse?: false;
}): Promise<Session | null>;
async function signInEmail(options: {
  body: { email: string; password: string };
  headers?: ReadonlyHeaders | Headers;
  asResponse?: boolean;
}): Promise<Response | Session | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ? headersToObject(options.headers) : {}),
      },
      body: JSON.stringify(options.body),
    });

    if (options.asResponse) {
      return response;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as Session;
  } catch (error) {
    if (IS_DEVELOPMENT) {
      console.error('[auth] Failed to sign in:', error);
    }
    if (options.asResponse) {
      return new Response(JSON.stringify({ error: 'Failed to sign in' }), { status: 500 });
    }
    return null;
  }
}

/**
 * Server-side auth API object that mirrors the better-auth server API.
 *
 * Usage:
 * ```ts
 * import { auth } from '@/utils/auth';
 *
 * const session = await auth.api.getSession({ headers: await headers() });
 * ```
 */
export const auth = {
  api: {
    getSession,
    getFullSession,
    getActiveMember,
    hasPermission,
    listOrganizations,
    setActiveOrganization,
    getFullOrganization,
    createInvitation,
    addMember,
    signUpEmail,
    signInEmail,
  },
  /**
   * Type inference helpers for compatibility with existing code.
   * These mirror the better-auth $Infer types.
   */
  $Infer: {
    Session: {} as Session,
    ActiveOrganization: {} as ActiveOrganization,
    Member: {} as Member,
    Organization: {} as Organization,
    Invitation: {} as Invitation,
  },
};

// Re-export types for convenience (maintains compatibility with existing imports)
export type { ReadonlyHeaders };

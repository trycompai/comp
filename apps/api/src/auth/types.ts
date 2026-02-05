// Types for API authentication - supports API keys and session-based auth

import { Departments } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  organizationId: string;
  authType: 'api-key' | 'session';
  isApiKey: boolean;
  isPlatformAdmin: boolean;
  userId?: string;
  userEmail?: string;
  userRoles: string[] | null;
  memberId?: string; // Member ID for assignment filtering (only available for session auth)
  memberDepartment?: Departments; // Member department for visibility filtering (only available for session auth)
}

export interface AuthContext {
  organizationId: string;
  authType: 'api-key' | 'session';
  isApiKey: boolean;
  isPlatformAdmin: boolean;
  userId?: string; // Only available for session auth
  userEmail?: string; // Only available for session auth
  userRoles: string[] | null;
  memberId?: string; // Member ID for assignment filtering (only available for session auth)
  memberDepartment?: Departments; // Member department for visibility filtering (only available for session auth)
}

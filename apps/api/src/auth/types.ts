// Types for API authentication - supports API keys and JWT tokens only

import { Departments } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  organizationId: string;
  authType: 'api-key' | 'jwt';
  isApiKey: boolean;
  userId?: string;
  userEmail?: string;
  userRoles: string[] | null;
  memberId?: string; // Member ID for assignment filtering (only available for JWT auth)
  memberDepartment?: Departments; // Member department for visibility filtering (only available for JWT auth)
}

export interface AuthContext {
  organizationId: string;
  authType: 'api-key' | 'jwt';
  isApiKey: boolean;
  userId?: string; // Only available for JWT auth
  userEmail?: string; // Only available for JWT auth
  userRoles: string[] | null;
  memberId?: string; // Member ID for assignment filtering (only available for JWT auth)
  memberDepartment?: Departments; // Member department for visibility filtering (only available for JWT auth)
}

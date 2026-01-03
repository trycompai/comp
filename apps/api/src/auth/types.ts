// Types for API authentication - supports API keys and JWT tokens only

export interface AuthenticatedRequest extends Request {
  organizationId?: string;
  authType: 'api-key' | 'jwt';
  isApiKey: boolean;
  userId?: string;
  userEmail?: string;
  userRoles: string[] | null;
}

export interface AuthContext {
  organizationId: string;
  authType: 'api-key' | 'jwt';
  isApiKey: boolean;
  userId?: string; // Only available for JWT auth
  userEmail?: string; // Only available for JWT auth
  userRoles: string[] | null;
}

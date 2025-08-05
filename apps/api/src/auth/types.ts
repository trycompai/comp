// Types removed - using JWT authentication only

export interface AuthenticatedRequest extends Request {
  organizationId: string;
  authType: 'api-key' | 'jwt';
  isApiKey: boolean;
  userId?: string;
  userEmail?: string;
}

export interface AuthContext {
  organizationId: string;
  authType: 'api-key' | 'jwt';
  isApiKey: boolean;
  userId?: string; // Only available for jwt auth
  userEmail?: string; // Only available for jwt auth
}

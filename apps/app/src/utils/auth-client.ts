import {
  emailOTPClient,
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { auth } from './auth';
import { ac, allRoles } from './permissions';

console.log('process.env.NEXT_PUBLIC_BETTER_AUTH_URL', process.env.NEXT_PUBLIC_BETTER_AUTH_URL);

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [
    organizationClient({
      ac,
      roles: allRoles,
    }),
    inferAdditionalFields<typeof auth>(),
    emailOTPClient(),
    magicLinkClient(),
  ],
  fetchOptions: {
    onSuccess: (ctx) => {
      console.log('📍 Auth client onSuccess triggered:', {
        url: ctx.response.url,
        status: ctx.response.status,
        headers: Array.from(ctx.response.headers.entries()),
      });

      // Capture JWT token (for external API authentication)
      const jwtToken = ctx.response.headers.get('set-auth-jwt');
      if (jwtToken) {
        localStorage.setItem('jwt_token', jwtToken);
        console.log('🎯 JWT token captured and stored:', jwtToken.substring(0, 20) + '...');
      } else {
        console.log('⚠️ No JWT token found in response headers');
      }
    },
  },
});

export const {
  signIn,
  signOut,
  useSession,
  useActiveOrganization,
  organization,
  useListOrganizations,
  useActiveMember,
} = authClient;

// Manual JWT token retrieval function for external API authentication
export async function getJwtToken(): Promise<string | null> {
  try {
    // First check localStorage for JWT token
    const storedToken = localStorage.getItem('jwt_token');
    if (storedToken) {
      console.log('🎯 Using stored JWT token');
      return storedToken;
    }

    // Try to get JWT token by calling getSession (triggers set-auth-jwt header)
    console.log('🔄 Attempting to retrieve JWT token via getSession');
    try {
      await authClient.getSession({
        fetchOptions: {
          onSuccess: (ctx) => {
            const jwtToken = ctx.response.headers.get('set-auth-jwt');
            if (jwtToken) {
              localStorage.setItem('jwt_token', jwtToken);
              console.log(
                '🎯 JWT token captured from getSession:',
                jwtToken.substring(0, 20) + '...',
              );
            }
          },
        },
      });

      // Check if we got the token
      const tokenAfterGetSession = localStorage.getItem('jwt_token');
      if (tokenAfterGetSession) {
        return tokenAfterGetSession;
      }
    } catch (getSessionError) {
      console.log('⚠️ getSession failed, trying /token endpoint');
    }

    // If no stored token, try to get one from the /token endpoint (JWT plugin)
    console.log('🔄 Attempting to retrieve JWT token from /token endpoint');
    const response = await fetch('/api/auth/token', {
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('jwt_token', data.token);
        console.log('🎯 JWT token retrieved and stored from /token endpoint');
        return data.token;
      }
    }

    console.log('⚠️ Could not retrieve JWT token');
    return null;
  } catch (error) {
    console.error('❌ Error retrieving JWT token:', error);
    return null;
  }
}

'use client';

import { authClient } from '@/utils/auth-client';
import { useEffect, useRef } from 'react';

export function JwtTokenManager() {
  const hasChecked = useRef(false);

  useEffect(() => {
    const ensureJwtToken = async () => {
      // Prevent multiple simultaneous checks
      if (hasChecked.current) return;
      hasChecked.current = true;

      try {
        // Check if we already have a valid JWT token
        const existingToken = localStorage.getItem('jwt_token');
        if (existingToken) {
          console.log('🎯 JWT token already available');
          return;
        }

        // Check if we have an active session
        const currentSession = await authClient.getSession();
        
        if (currentSession.data?.session) {
          console.log('🔄 Active session found, capturing JWT token...');
          
          // Call getSession with onSuccess to capture JWT token
          await authClient.getSession({
            fetchOptions: {
              onSuccess: (ctx) => {
                const jwtToken = ctx.response.headers.get('set-auth-jwt');
                if (jwtToken) {
                  localStorage.setItem('jwt_token', jwtToken);
                  console.log('🎯 JWT token captured and stored');
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('❌ Error ensuring JWT token:', error);
      } finally {
        hasChecked.current = false;
      }
    };

    // Initial check
    ensureJwtToken();

    // Set up a periodic check every 30 seconds to ensure token availability
    const interval = setInterval(() => {
      const hasToken = localStorage.getItem('jwt_token');
      if (!hasToken) {
        ensureJwtToken();
      }
    }, 30000);

    // Listen for storage changes (in case token is cleared)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jwt_token' && !e.newValue) {
        console.log('🔄 JWT token removed, attempting to restore...');
        ensureJwtToken();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null; // This component doesn't render anything
}
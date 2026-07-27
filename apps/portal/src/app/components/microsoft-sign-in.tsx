'use client';

import { authClient } from '@/app/lib/auth-client';
import { buildSignInCallbackUrls } from '@/app/lib/auth-callback';
import { Button } from '@trycompai/ui/button';
import { Icons } from '@trycompai/ui/icons';
import { Spinner } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';

export function MicrosoftSignIn({
  inviteCode,
  searchParams,
}: {
  inviteCode?: string;
  searchParams?: URLSearchParams;
}) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    try {
      const { callbackURL, errorCallbackURL } = buildSignInCallbackUrls({
        origin: window.location.origin,
        inviteCode,
        searchParams,
      });

      await authClient.signIn.social({
        provider: 'microsoft',
        callbackURL,
        // Without this, an OAuth callback error redirects to the API root
        // (Swagger docs) instead of back to the portal. See CS-760.
        errorCallbackURL,
      });
    } catch (error) {
      setLoading(false);

      console.error('[Microsoft Sign-In] Authentication failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Show specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('redirect_uri_mismatch')) {
          toast.error('Configuration error', {
            description: 'Redirect URI mismatch. Please contact support.',
          });
        } else if (error.message.includes('invalid_client')) {
          toast.error('Invalid credentials', {
            description: 'Microsoft OAuth credentials are invalid. Please contact support.',
          });
        } else if (error.message.includes('account_not_linked')) {
          toast.error('Account linking failed', {
            description: 'Unable to link Microsoft account automatically. Please contact support.',
          });
          console.warn(
            '[Microsoft Sign-In] account_not_linked error occurred despite auto-linking being enabled. Check account linking configuration.',
          );
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          toast.error('Network error', {
            description: 'Please check your internet connection and try again.',
          });
        } else {
          toast.error('Sign-in failed', {
            description: error.message || 'An unexpected error occurred. Please try again.',
          });
        }
      } else {
        toast.error('Failed to sign in with Microsoft', {
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      className="w-full h-11 font-medium"
      variant="outline"
      disabled={isLoading}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <>
          <Icons.Microsoft className="h-4 w-4" />
          Continue with Microsoft
        </>
      )}
    </Button>
  );
}

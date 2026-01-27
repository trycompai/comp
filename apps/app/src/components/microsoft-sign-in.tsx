'use client';

import { authClient } from '@/utils/auth-client';
import { buildAuthCallbackUrl } from '@/utils/auth-callback';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface MicrosoftSignInProps {
  inviteCode?: string;
  redirectTo?: string;
}

export function MicrosoftSignIn({ inviteCode, redirectTo }: MicrosoftSignInProps) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    try {
      const callbackURL = buildAuthCallbackUrl({ inviteCode, redirectTo });

      await authClient.signIn.social({
        provider: 'microsoft',
        callbackURL,
      });
    } catch (error) {
      setLoading(false);

      console.error('[Microsoft Sign-In] Authentication failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

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
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Icons.Microsoft className="h-4 w-4" />
          Continue with Microsoft
        </>
      )}
    </Button>
  );
}

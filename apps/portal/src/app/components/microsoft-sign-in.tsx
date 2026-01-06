'use client';

import { authClient } from '@/app/lib/auth-client';
import { Button } from '@trycompai/design-system';
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
      // Build the callback URL with search params
      const baseURL = window.location.origin;
      const path = inviteCode ? `/invite/${inviteCode}` : '/';
      const redirectTo = new URL(path, baseURL);

      // Append all search params if they exist
      if (searchParams) {
        searchParams.forEach((value, key) => {
          redirectTo.searchParams.append(key, value);
        });
      }

      await authClient.signIn.social({
        provider: 'microsoft',
        callbackURL: redirectTo.toString(),
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
      variant="outline"
      size="lg"
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Redirecting…' : 'Continue with Microsoft'}
    </Button>
  );
}

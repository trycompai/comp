'use client';

import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
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
      
      // Handle account_not_linked error
      if (error instanceof Error && error.message.includes('account_not_linked')) {
        toast.error('Account already exists with this email', {
          description: 'Please sign in with your original method (magic link) first, then link Microsoft from settings.',
        });
      } else {
        toast.error('Failed to sign in with Microsoft');
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

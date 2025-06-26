'use client';

import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

export function GithubSignIn({
  inviteCode,
  searchParams,
}: {
  inviteCode?: string;
  searchParams?: URLSearchParams;
}) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

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
      provider: 'github',
      callbackURL: redirectTo.toString(),
    });
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
          <Icons.Github className="h-4 w-4" />
          Continue with GitHub
        </>
      )}
    </Button>
  );
}

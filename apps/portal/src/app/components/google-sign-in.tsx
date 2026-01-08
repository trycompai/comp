'use client';

import { authClient } from '@/app/lib/auth-client';
import { Button } from '@trycompai/design-system';
import { useState } from 'react';

export function GoogleSignIn({
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
      provider: 'google',
      callbackURL: redirectTo.toString(),
    });
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="outline"
      size="lg"
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Redirecting…' : 'Continue with Google'}
    </Button>
  );
}

'use client';

import { authClient } from '@/app/lib/auth-client';
import { buildSignInCallbackUrls } from '@/app/lib/auth-callback';
import { Button } from '@trycompai/ui/button';
import { Icons } from '@trycompai/ui/icons';
import { Spinner } from '@trycompai/design-system';
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

    const { callbackURL, errorCallbackURL } = buildSignInCallbackUrls({
      origin: window.location.origin,
      inviteCode,
      searchParams,
    });

    await authClient.signIn.social({
      provider: 'google',
      callbackURL,
      // Without this, an OAuth callback error redirects to the API root
      // (Swagger docs) instead of back to the portal. See CS-760.
      errorCallbackURL,
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
        <Spinner size="sm" />
      ) : (
        <>
          <Icons.Google className="h-4 w-4" />
          Continue with Google
        </>
      )}
    </Button>
  );
}

'use client';

import { authClient } from '@/utils/auth-client';
import { buildAuthCallbackUrl } from '@/utils/auth-callback';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface GithubSignInProps {
  inviteCode?: string;
  redirectTo?: string;
}

export function GithubSignIn({ inviteCode, redirectTo }: GithubSignInProps) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);

    const callbackURL = buildAuthCallbackUrl({ inviteCode, redirectTo });

    await authClient.signIn.social({
      provider: 'github',
      callbackURL,
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

'use client';

import { authClient } from '@/app/lib/auth-client';
import { Button } from '@comp/ui/button';
import { Icons } from '@comp/ui/icons';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ButtonIcon } from './button-icon';

export function GoogleSignIn({ inviteCode }: { inviteCode?: string }) {
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    let redirectTo = '/';

    if (inviteCode) {
      redirectTo = `/invite/${inviteCode}`;
    }

    await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirectTo,
    });
  };

  return (
    <Button
      onClick={handleSignIn}
      className="flex h-[40px] w-full space-x-2 px-6 py-4 font-medium active:scale-[0.98]"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <ButtonIcon isLoading={isLoading}>
            <Icons.Google />
          </ButtonIcon>
          <span>Sign in with Google</span>
        </>
      )}
    </Button>
  );
}

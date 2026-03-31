'use client';

import { Button } from '@trycompai/ui/button';
import { DropdownMenuItem } from '@trycompai/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '../lib/auth-client';

export function SignOut({ asButton = false }: { asButton?: boolean }) {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/auth');
        },
      },
    });
  };

  if (asButton) {
    return <Button onClick={handleSignOut}>{isLoading ? 'Loading...' : 'Sign out'}</Button>;
  }

  return (
    <DropdownMenuItem onClick={handleSignOut}>
      {isLoading ? 'Loading...' : 'Sign out'}
    </DropdownMenuItem>
  );
}

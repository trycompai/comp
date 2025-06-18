'use client';

import { authClient } from '@/app/lib/auth-client';
import { DropdownMenuItem } from '@comp/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Logout() {
  const [isLoading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/auth'); // Redirect to /auth instead of /login
        },
      },
    });
    setLoading(false);
  };

  return (
    <DropdownMenuItem onClick={handleLogout}>
      {isLoading ? 'Loading...' : 'Sign Out'}
    </DropdownMenuItem>
  );
}

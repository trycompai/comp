'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import { authClient } from '@/utils/auth-client';
import type { Organization } from '@comp/db/types';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import type { User } from 'better-auth';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SetupHeaderProps {
  user: User;
  existingOrganizations?: Organization[];
}

export function SetupHeader({ user, existingOrganizations = [] }: SetupHeaderProps) {
  const router = useRouter();
  const hasExistingOrgs = existingOrganizations.length > 0;
  const [isSigningOut, setIsSigningOut] = useState(false);

  const changeOrgAction = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
    },
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/auth');
        },
      },
    });
  };

  return (
    <header className="border/40 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center">
        {hasExistingOrgs && (
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => changeOrgAction.execute({ organizationId: existingOrganizations[0].id })}
            disabled={changeOrgAction.status === 'executing'}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {existingOrganizations.length === 1 ? (
                <>Continue with {existingOrganizations[0].name || 'your organization'}</>
              ) : (
                <>Back to your organizations</>
              )}
            </span>
            <span className="sm:hidden">Back</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Logged in as {user.email}
        </span>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.image ?? ''} />
            <AvatarFallback className="text-xs">{user.name?.[0] || user.email?.[0]}</AvatarFallback>
          </Avatar>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

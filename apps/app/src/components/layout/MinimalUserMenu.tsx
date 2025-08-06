'use client';

import { authClient } from '@/utils/auth-client';
import { Avatar, AvatarFallback, AvatarImageNext } from '@comp/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { User } from 'better-auth';
import { T, useGT } from 'gt-next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ThemeSwitch } from '../theme-switch';

interface MinimalUserMenuProps {
  user: User;
}

export function MinimalUserMenu({ user }: MinimalUserMenuProps) {
  const t = useGT();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          {user.image && (
            <AvatarImageNext
              src={user.image}
              alt={user.name ?? user.email ?? ''}
              width={32}
              height={32}
              quality={100}
            />
          )}
          <AvatarFallback>
            <span className="text-xs">
              {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
            </span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="line-clamp-1 block max-w-[155px] truncate">{user.name}</span>
              <span className="truncate text-xs font-normal text-[#606060]">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-row items-center justify-between p-2">
          <T>
            <p className="text-sm">Theme</p>
          </T>
          <ThemeSwitch />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? t('Signing out...') : t('Sign out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

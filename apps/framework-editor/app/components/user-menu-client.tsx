'use client';

import { Avatar, AvatarFallback, AvatarImageNext } from '@trycompai/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';

import { SignOut } from './sign-out';

type User = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function UserMenuClient({
  user,
  onlySignOut,
}: {
  user: User | null;
  onlySignOut?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          {user?.image && (
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
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
            </span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        {!onlySignOut && (
          <DropdownMenuLabel>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="line-clamp-1 block max-w-[155px] truncate">{user?.name}</span>
                <span className="truncate text-xs font-normal text-[#606060]">{user?.email}</span>
              </div>
              <div className="rounded-full border px-3 py-0.5 text-[11px] font-normal">Beta</div>
            </div>
          </DropdownMenuLabel>
        )}

        <SignOut />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
